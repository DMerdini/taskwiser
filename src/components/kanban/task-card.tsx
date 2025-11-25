'use client';
import React, { useState, useEffect } from 'react';
import type { AppUser, Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, User, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTaskDialog } from '@/providers/task-dialog-provider';
import { DeleteDialog } from './delete-dialog';
import HtmlPreview from './markdown-preview';
import { TaskHistoryDialog } from './task-history-dialog';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import useAuthentication from '@/hooks/use-authentication';

interface TaskCardProps {
  task: Task;
  isDragged: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isDragged,
  onDragStart,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [assignedUser, setAssignedUser] = useState<AppUser | null>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { appUser } = useAuthentication();
  const { setTask, setIsOpen } = useTaskDialog();

  useEffect(() => {
    if (db && task.userId) {
        const userRef = doc(db, 'users', task.userId);
        getDoc(userRef).then(docSnap => {
            if (docSnap.exists()) {
                setAssignedUser(docSnap.data() as AppUser);
            }
        });
    }
  }, [db, task.userId]);

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length > 1 && words[1]) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleEdit = () => {
    setTask(task);
    setIsOpen(true);
  };
  
  const handleDelete = async () => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      toast({
        title: 'Task Deleted',
        description: `"${task.name}" has been permanently deleted.`,
      });
      // No need to call onTaskDeleted, the real-time listener will update the UI
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Could not delete task: ${error.message}`,
      });
    }
  }
  
  const isAdminView = appUser?.role === 'sysadmin' || appUser?.role === 'depadmin';

  return (
    <>
      <Card
        id={task.id}
        draggable
        onDragStart={onDragStart}
        className={cn(
          'cursor-grab active:cursor-grabbing transition-opacity hover:shadow-md',
          isDragged && 'opacity-50',
          isAdminView && 'border-l-4'
        )}
        style={isAdminView && task.depcolor ? { borderLeftColor: task.depcolor } : {}}
      >
        <CardHeader className="flex flex-row items-start justify-between p-2 space-y-0">
          <CardTitle className="text-sm font-medium leading-tight truncate pr-2">
            {task.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="-mr-1 -mt-1 p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Task options</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                Edit / View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsHistoryDialogOpen(true)}>
                View History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-2 pt-0">
           {task.isReviewed && (
            <Badge variant="outline" className="mb-1 text-blue-600 border-blue-600">
              <Eye className="mr-1 h-3 w-3" />
              Reviewed
            </Badge>
          )}
          {task.comments && (
            <div className="text-xs text-muted-foreground line-clamp-1 mb-1">
                <HtmlPreview htmlContent={task.comments} />
            </div>
          )}
          <div className="flex items-center justify-between mt-1">
            {isAdminView ? (
                 <Badge variant="secondary" style={task.depcolor ? { backgroundColor: task.depcolor + '30', color: task.depcolor } : {}}>
                    {task.department || 'No Dept.'}
                </Badge>
            ) : <div />}
            <div className="flex items-center gap-2 text-muted-foreground" title={assignedUser?.displayName || 'Unassigned'}>
                <span className="text-xs truncate">{assignedUser?.displayName?.split(' ')[0]}</span>
                 <Avatar className="h-6 w-6">
                    <AvatarImage src={assignedUser?.photoURL || undefined} alt={assignedUser?.displayName || 'User'} />
                    <AvatarFallback>{getInitials(assignedUser?.displayName)}</AvatarFallback>
                </Avatar>
            </div>
          </div>
        </CardContent>
      </Card>
      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        taskId={task.id}
        taskName={task.name}
        onTaskDeleted={handleDelete}
      />
      <TaskHistoryDialog
        isOpen={isHistoryDialogOpen}
        setIsOpen={setIsHistoryDialogOpen}
        taskName={task.name}
        history={task.history}
      />
    </>
  );
};

export default TaskCard;
