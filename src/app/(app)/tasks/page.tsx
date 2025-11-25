'use client';

import { useMemo, useState } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { idToStatus, taskStatuses } from '@/lib/types';
import KanbanBoard from '@/components/kanban/board';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  writeBatch,
  getDocs,
  query,
  collection,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import useAuthentication from '@/hooks/use-authentication';
import { SysAdminDeleteDialog } from '@/components/kanban/sysadmin-delete-dialog';

export default function TasksPage() {
  const { appUser } = useAuthentication();
  const { tasks, loading, reorderTasks } = useTasks();
  const { toast } = useToast();
  const db = useFirestore();
  const [isSysAdminDeleteOpen, setIsSysAdminDeleteOpen] = useState(false);

  const handleDragEnd = async (
    taskId: string,
    newStatusId: string,
    newIndex: number
  ) => {
    const newStatus = idToStatus[newStatusId];
    if (!newStatus || !tasks) return;
    await reorderTasks(taskId, newStatus, newIndex);
    // The useTasks hook will handle UI updates, so a toast here might be redundant
    // if you have optimistic updates. If not, this is a good place for it.
    // toast({ title: 'Task moved successfully' });
  };
  
  const handleExport = () => {
    if (!tasks || tasks.length === 0) {
      toast({ title: 'No tasks to export' });
      return;
    }
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'tasks.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleDeleteAll = async () => {
    if (!db) return;
    const q = query(collection(db, 'tasks'));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    try {
      await batch.commit();
      toast({
        title: 'Success',
        description: 'All tasks have been permanently deleted.',
      });
      setIsSysAdminDeleteOpen(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete all tasks.',
      });
    }
  };

  const columns = useMemo(() => {
    if (!tasks) return [];
    // Exclude 'Archived' and 'Deprecated' statuses from the main board
    const activeStatuses = taskStatuses.filter(s => s !== 'Archived' && s !== 'Deprecated');
    return activeStatuses.map((status) => {
      const statusId = Object.keys(idToStatus).find(key => idToStatus[key] === status) || '';
      const filteredTasks = tasks
        .filter((task) => task.status === status)
        .sort((a, b) => a.order - b.order)

      return {
        id: statusId,
        title: status,
        tasks: filteredTasks,
      }
    });
  }, [tasks]);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {taskStatuses.filter(s => s !== 'Archived' && s !== 'Deprecated' && s !== 'Rejected').map((status) => (
            <div key={status} className="flex flex-col gap-4 p-4 bg-card rounded-lg">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-semibold text-lg md:text-2xl">My Tasks</h1>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export JSON
          </Button>

          {appUser?.role === 'sysadmin' && (
             <Button variant="destructive" size="sm" onClick={() => setIsSysAdminDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete All
             </Button>
          )}
        </div>
      </div>
      <KanbanBoard
        columns={columns}
        onTaskDrop={handleDragEnd}
      />
      {appUser?.role === 'sysadmin' && (
        <SysAdminDeleteDialog
            isOpen={isSysAdminDeleteOpen}
            setIsOpen={setIsSysAdminDeleteOpen}
            onConfirmDelete={handleDeleteAll}
        />
      )}
    </>
  );
}
