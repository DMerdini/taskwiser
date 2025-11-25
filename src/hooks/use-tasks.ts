'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  doc,
  arrayUnion,
  getDocs,
  Timestamp,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import useAuthentication from './use-authentication';
import type { Task, TaskStatus, Department, TaskHistoryEntry } from '@/lib/types';
import { useToast } from './use-toast';
import { useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';

const ARCHIVE_HOURS = 48;

export function useTasks() {
  const { user, appUser } = useAuthentication();
  const db = useFirestore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const tasksRef = useRef(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const tasksQuery = useMemoFirebase(() => {
    if (!user?.uid || !db || !appUser) return null;
    
    if (appUser.role === 'sysadmin') {
      return collection(db, 'tasks');
    }
    if (appUser.role === 'depadmin' && appUser.department) {
      return query(collection(db, 'tasks'), where('department', '==', appUser.department));
    }
    if (appUser.role === 'user') {
      return query(collection(db, 'tasks'), where('userId', '==', user.uid));
    }
    return null;
  }, [user?.uid, appUser, db]);


  const archiveOldTasks = useCallback(async (tasksToProcess: Task[]) => {
    if (!db || tasksToProcess.length === 0) return;

    const batch = writeBatch(db);
    let batchHasWrites = false;
    const now = new Date();
    const archiveThreshold = now.getTime() - ARCHIVE_HOURS * 60 * 60 * 1000;

    tasksToProcess.forEach(task => {
        if (task.status === 'Done' && task.doneAt) {
            const doneAtMillis = (task.doneAt as Timestamp).toMillis();
            if (doneAtMillis < archiveThreshold) {
                const taskRef = doc(db, 'tasks', task.id);
                const historyEntry: TaskHistoryEntry = {
                    field: 'status',
                    oldValue: 'Done',
                    newValue: 'Archived',
                    changedBy: 'system',
                    timestamp: new Date()
                };
                batch.update(taskRef, {
                    status: 'Archived',
                    history: arrayUnion(historyEntry)
                });
                batchHasWrites = true;
            }
        }
    });

    if (batchHasWrites) {
        try {
            await batch.commit();
            toast({
                title: "Tasks Archived",
                description: "Old tasks in 'Done' have been automatically archived."
            });
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: 'tasks (batch archive)',
                    operation: 'update'
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.error("Failed to archive old tasks:", error);
            }
        }
    }
}, [db, toast]);


  useEffect(() => {
    if (!tasksQuery) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      tasksQuery,
      async (querySnapshot) => {
        let tasksData: Task[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

        if (db && (appUser?.role === 'sysadmin' || appUser?.role === 'depadmin')) {
            try {
                const departmentsSnapshot = await getDocs(collection(db, 'departments'));
                const departmentColors: Record<string, string> = {};
                departmentsSnapshot.forEach(doc => {
                    const dep = doc.data() as Department;
                    departmentColors[dep.name] = dep.depcolor;
                });
                tasksData = tasksData.map(task => ({
                    ...task,
                    depcolor: task.department ? departmentColors[task.department] : undefined
                }));
            } catch (e) {
                console.error("Could not fetch departments for task colors:", e);
            }
        }
        
        setTasks(tasksData.sort((a, b) => a.order - b.order));
        
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        const permissionError = new FirestorePermissionError({
            path: (tasksQuery as any)._query.path.canonicalString(),
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tasksQuery, toast, db, appUser]);

  useEffect(() => {
    const runArchive = () => {
      const currentTasks = tasksRef.current;
      if (currentTasks.length > 0) {
        archiveOldTasks(currentTasks);
      }
    };
  
    // Only run on the client-side after initial hydration
    if (typeof window !== 'undefined') {
        const timeoutId = setTimeout(runArchive, 5000); // Run after 5s to ensure everything is settled
        return () => clearTimeout(timeoutId);
    }
  }, [archiveOldTasks]);

  const reorderTasks = async (
    taskId: string,
    newStatus: TaskStatus,
    newIndex: number
  ): Promise<boolean> => {
    if (!db || !appUser) return false;

    const currentTasks = tasksRef.current;
    const taskToMove = currentTasks.find((t) => t.id === taskId);
    if (!taskToMove) return false;
  
    const isStatusChange = taskToMove.status !== newStatus;
  
    if (!isStatusChange && taskToMove.order === newIndex) {
      return false; // No change needed
    }
  
    const batch = writeBatch(db);
    const taskRef = doc(db, 'tasks', taskId);
  
    // --- Optimistically update local state for a smoother UI ---
    const optimisticTasks = currentTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status: newStatus, order: newIndex };
      }
      return t;
    }).sort((a, b) => a.order - b.order);
    setTasks(optimisticTasks);
    // ---------------------------------------------------------
  
    const updates: { [key: string]: any } = { status: newStatus, order: newIndex };
  
    if (isStatusChange) {
      if (newStatus === 'Done') {
        updates.doneAt = serverTimestamp();
      } else {
        updates.doneAt = null;
      }
      
      const historyEntry: TaskHistoryEntry = {
        field: 'status',
        oldValue: taskToMove.status,
        newValue: newStatus,
        changedBy: appUser.uid,
        timestamp: new Date(),
      };
      updates.history = arrayUnion(historyEntry);
    }
    
    // --- Update the dragged task ---
    batch.update(taskRef, updates);
  
    // --- Re-order tasks in the source column (if status changed) ---
    if (isStatusChange) {
      const sourceColTasks = currentTasks
        .filter(t => t.status === taskToMove.status && t.id !== taskId)
        .sort((a, b) => a.order - b.order);
      
      sourceColTasks.forEach((task, index) => {
        if (task.order !== index) {
          batch.update(doc(db, 'tasks', task.id), { order: index });
        }
      });
    }
  
    // --- Re-order tasks in the destination column ---
    const destColTasks = currentTasks
      .filter(t => t.status === newStatus && t.id !== taskId)
      .sort((a, b) => a.order - b.order);
      
    // Create a temporary array with the moved task to find correct new orders
    const tempDestCol = [...destColTasks];
    tempDestCol.splice(newIndex, 0, { ...taskToMove, status: newStatus, order: -1 }); // order -1 is a placeholder

    tempDestCol.forEach((task, index) => {
      // update any task that is not the one we are moving and whose order has changed
      if (task.id !== taskId && task.order !== index) {
         batch.update(doc(db, 'tasks', task.id), { order: index });
      }
    });
  
    try {
      await batch.commit();
      return true; // Indicates an update was made
    } catch (e: any) {
      console.error(e);
      // Revert optimistic update on failure
      setTasks(currentTasks);
      const permissionError = new FirestorePermissionError({
        path: taskRef.path,
        operation: 'update',
        requestResourceData: updates,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({ variant: 'destructive', title: 'Error moving task', description: 'You may not have permissions.' });
      return false;
    }
  };

  return { tasks, loading, reorderTasks };
}
