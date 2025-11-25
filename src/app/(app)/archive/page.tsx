'use client';
import { useState, useMemo } from 'react';
import useAuthentication from '@/hooks/use-authentication';
import { useTasks } from '@/hooks/use-tasks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTaskDialog } from '@/providers/task-dialog-provider';
import { format } from 'date-fns';
import type { Task, TaskHistoryEntry } from '@/lib/types';
import { Eye } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

export default function ArchivePage() {
  const { appUser, loading: authLoading } = useAuthentication();
  const { tasks, loading: tasksLoading } = useTasks();
  const { setTask, setIsOpen } = useTaskDialog();

  const archivedTasks = useMemo(() => {
    return tasks
      .filter(task => task.status === 'Archived')
      .sort((a, b) => {
        const dateA = a.doneAt ? (a.doneAt as Timestamp).toDate() : 0;
        const dateB = b.doneAt ? (b.doneAt as Timestamp).toDate() : 0;
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });
  }, [tasks]);

  const handleViewTask = (task: Task) => {
    setTask(task);
    setIsOpen(true);
  };
  
  const loading = authLoading || tasksLoading;

  const toDate = (timestamp: Timestamp | Date | undefined | null): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-lg border p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-semibold text-lg md:text-2xl">Archived Tasks</h1>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Name</TableHead>
              {appUser?.role === 'sysadmin' && <TableHead>Department</TableHead>}
              <TableHead>Archived On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {archivedTasks.length > 0 ? (
              archivedTasks.map(task => {
                 const lastHistoryEntry = task.history
                    ?.filter(h => h.status === 'Archived')
                    .sort((a, b) => {
                       const dateA = toDate(a.timestamp);
                       const dateB = toDate(b.timestamp);
                       if (!dateA || !dateB) return 0;
                       return dateB.getTime() - dateA.getTime();
                    })[0];
                 
                 const historyDate = toDate(lastHistoryEntry?.timestamp);
                 const doneDate = toDate(task.doneAt);

                 const archivedDate = historyDate 
                    ? historyDate 
                    : (doneDate ? new Date(doneDate.getTime() + 48 * 60 * 60 * 1000) : null);

                return (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  {appUser?.role === 'sysadmin' && (
                    <TableCell>
                      <Badge variant="secondary" style={task.depcolor ? { backgroundColor: task.depcolor + '30', color: task.depcolor } : {}}>
                          {task.department}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    {archivedDate ? format(archivedDate, 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewTask(task)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View / Reopen
                    </Button>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={appUser?.role === 'sysadmin' ? 4 : 3} className="text-center h-24">
                  No archived tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
