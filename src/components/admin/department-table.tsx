'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Department, Task } from '@/lib/types';
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEffect, useState } from 'react';

interface DepartmentTableProps {
  departments: Department[];
}

interface TaskCounts {
    [departmentName: string]: {
        inProgress: number;
        toBeReviewed: number;
        deprecated: number;
        done: number;
        archived: number;
    }
}

export function DepartmentTable({ departments }: DepartmentTableProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    if (!db) return;
    setLoadingCounts(true);
    const fetchTaskCounts = async () => {
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        const counts: TaskCounts = {};

        departments.forEach(dep => {
            counts[dep.name] = { inProgress: 0, toBeReviewed: 0, deprecated: 0, done: 0, archived: 0 };
        });

        tasksSnapshot.forEach(doc => {
            const task = doc.data() as Task;
            if (task.department && counts[task.department]) {
                switch (task.status) {
                    case 'In Progress':
                        counts[task.department].inProgress += 1;
                        break;
                    case 'To Be Reviewed':
                        counts[task.department].toBeReviewed += 1;
                        break;
                    case 'Deprecated':
                        counts[task.department].deprecated += 1;
                        break;
                    case 'Done':
                        counts[task.department].done += 1;
                        break;
                    case 'Archived':
                        counts[task.department].archived += 1;
                        break;
                }
            }
        });
        setTaskCounts(counts);
        setLoadingCounts(false);
    };

    fetchTaskCounts();
  }, [db, departments]);

  const handleDelete = (department: Department) => {
    if (!db) return;

    const depRef = doc(db, 'departments', department.id);
    deleteDoc(depRef)
      .then(() => {
        toast({ title: 'Department Deleted', description: `${department.name} has been removed.` });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: depRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: 'Could not delete department. Check permissions.',
        });
      });
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Color</TableHead>
            <TableHead>In Progress</TableHead>
            <TableHead>To Be Reviewed</TableHead>
            <TableHead>Deprecated</TableHead>
            <TableHead>Done</TableHead>
            <TableHead>Archived</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((dep) => (
            <TableRow key={dep.id}>
              <TableCell className="font-medium">{dep.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: dep.depcolor }} />
                  <span className="font-mono text-muted-foreground">{dep.depcolor}</span>
                </div>
              </TableCell>
               <TableCell>{loadingCounts ? '...' : taskCounts[dep.name]?.inProgress ?? 0}</TableCell>
               <TableCell>{loadingCounts ? '...' : taskCounts[dep.name]?.toBeReviewed ?? 0}</TableCell>
               <TableCell>{loadingCounts ? '...' : taskCounts[dep.name]?.deprecated ?? 0}</TableCell>
               <TableCell>{loadingCounts ? '...' : taskCounts[dep.name]?.done ?? 0}</TableCell>
               <TableCell>{loadingCounts ? '...' : taskCounts[dep.name]?.archived ?? 0}</TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the <strong>{dep.name}</strong> department. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(dep)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
