'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import type { AppUser, Task, TaskStatus, Department, TaskHistoryEntry } from '@/lib/types';
import { taskStatuses } from '@/lib/types';
import { addDoc, collection, doc, updateDoc, arrayUnion, getDocs, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import RichTextToolbar from './rich-text-toolbar';
import { summarizeTaskDescription } from '@/ai/flows/summarize-task-description';
import { useTaskDialog } from '@/providers/task-dialog-provider';
import useAuthentication from '@/hooks/use-authentication';
import DOMPurify from 'dompurify';
import RichTextEditor from './rich-text-editor';

const formSchema = z.object({
  name: z.string().min(1, 'Task name is required.'),
  department: z.string().optional(),
  comments: z.string().optional(),
  status: z.enum(taskStatuses),
  userId: z.string().optional(),
});

type TaskFormValue = z.infer<typeof formSchema>;

interface TaskDialogProps {
  tasks: Task[];
}

export function TaskDialog({ tasks }: TaskDialogProps) {
  const { isOpen, setIsOpen, task, setTask } = useTaskDialog();
  const { toast } = useToast();
  const auth = useAuth();
  const { appUser } = useAuthentication();
  const db = useFirestore();
  const [loading, setLoading] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [usersInDept, setUsersInDept] = React.useState<AppUser[]>([]);

  const isEditMode = !!task;
  const isAdmin = appUser?.role === 'sysadmin' || appUser?.role === 'depadmin';

  const availableStatuses = React.useMemo(() => {
    if (!isEditMode || !task) return ['In Progress']; // New tasks can only be 'In Progress'
    if (!appUser) return [];

    const currentStatus = task.status;

    if (isAdmin) {
        if (currentStatus === 'To Be Reviewed') {
            return ['In Progress', 'Done', 'Deprecated'];
        }
        // Admins can move from any status to another (except Archived)
        return taskStatuses.filter(s => s !== 'Archived');
    }
    
    // Regular user
    if (currentStatus === 'In Progress') {
        return ['In Progress', 'To Be Reviewed'];
    }
    
    // If it's in another state, user can't change it.
    return [currentStatus];

  }, [appUser, isEditMode, task, isAdmin]);


  const form = useForm<TaskFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      department: '',
      comments: '',
      status: 'In Progress',
      userId: '',
    },
  });

  const selectedDepartment = form.watch('department');

  React.useEffect(() => {
    if (!db) return;
    const fetchDepartments = async () => {
        const departmentsCol = collection(db, 'departments');
        const departmentsSnapshot = await getDocs(departmentsCol);
        const departmentsList = departmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
        setDepartments(departmentsList);
    };
    fetchDepartments();
  }, [db]);
  
  React.useEffect(() => {
    if (isOpen) {
        const initialValues = isEditMode
            ? {
                name: task.name,
                department: task.department,
                comments: task.comments,
                status: task.status,
                userId: task.userId,
              }
            : {
                name: '',
                department: appUser?.department || '',
                comments: '',
                status: 'In Progress' as TaskStatus,
                userId: appUser?.uid || '',
              };
        form.reset(initialValues);
    }
  }, [isOpen, task, isEditMode, form, appUser]);

  React.useEffect(() => {
    if (!db || !selectedDepartment) {
        setUsersInDept([]);
        return;
    }
    const usersQuery = query(collection(db, 'users'), where('department', '==', selectedDepartment));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
        setUsersInDept(users);

        // If the currently assigned user is not in the new list of users, reset it.
        const currentUserId = form.getValues('userId');
        if (currentUserId && !users.some(u => u.uid === currentUserId)) {
            // Check if the current app user is in the selected department. If so, default to them. Otherwise, default to the first user or empty.
            const isCurrentUserInDept = appUser?.department === selectedDepartment;
            form.setValue('userId', isCurrentUserInDept ? appUser.uid : (users[0]?.uid || ''));
        } else if (!currentUserId) {
            // If no user is assigned, default to current user if they are in the dept, or first user.
            const isCurrentUserInDept = appUser?.department === selectedDepartment;
            form.setValue('userId', isCurrentUserInDept ? appUser.uid : (users[0]?.uid || ''));
        }
    });
    return () => unsubscribe();
  }, [db, selectedDepartment, form, appUser]);


  const handleSummarize = async () => {
    const description = form.getValues('comments');
    if (!description || description.trim().length < 20) {
      toast({
        variant: 'destructive',
        title: 'Description too short',
        description: 'Please provide a longer description to summarize.',
      });
      return;
    }
    setAiLoading(true);
    try {
      const result = await summarizeTaskDescription({ description });
      const currentComments = form.getValues('comments') || '';
      const newComments = `${currentComments}<hr><p><b>AI Summary:</b></p><p>${result.summary}</p>`;
      form.setValue('comments', newComments, { shouldDirty: true, shouldValidate: true });
      toast({
        title: 'Summary Generated',
        description: 'An AI-powered summary has been added to the comments.',
      });
    } catch (error) {
      console.error('AI summarization failed:', error);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not generate summary.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  function sanitizeHtml(html: string | undefined): string {
    if (typeof window === 'undefined' || !html) {
        return '';
    }
    return DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ALLOWED_TAGS: ['strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'br', 'p', 'div', 'b', 'i', 'hr'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }


  const onSubmit = async (data: TaskFormValue) => {
    setLoading(true);
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to create or edit tasks.',
      });
      setLoading(false);
      return;
    }

    if (!db) {
      toast({
        variant: 'destructive',
        title: 'Database Error',
        description: 'Firestore is not initialized.',
      });
      setLoading(false);
      return;
    }

    const sanitizedData = { ...data, comments: sanitizeHtml(data.comments) };
    
    if (isEditMode) {
        const taskRef = doc(db, 'tasks', task.id);
        const updates: { [key: string]: any } = {};
        
        const newHistoryEntries: Omit<TaskHistoryEntry, 'timestamp'>[] = [];
        
        // Check for changes and create history entries
        (Object.keys(sanitizedData) as Array<keyof TaskFormValue>).forEach(key => {
            if (sanitizedData[key] !== task[key as keyof Task] && (sanitizedData[key] || task[key as keyof Task])) {
                 newHistoryEntries.push({
                    field: key,
                    oldValue: task[key as keyof Task],
                    newValue: sanitizedData[key],
                    changedBy: currentUser.uid,
                });
                updates[key] = sanitizedData[key];
            }
        });

        if (newHistoryEntries.length > 0) {
            const historyWithTimestamps = newHistoryEntries.map(entry => ({
                ...entry,
                timestamp: new Date(),
            }));
            updates.history = arrayUnion(...historyWithTimestamps);
        }
        
        const statusChanged = task.status !== sanitizedData.status;

        if (statusChanged) {
          const tasksInNewStatus = tasks.filter(t => t.status === sanitizedData.status);
          updates.order = tasksInNewStatus.length;
           if (sanitizedData.status === 'Done') {
            updates.doneAt = serverTimestamp();
          } else {
            updates.doneAt = null;
          }
          if (sanitizedData.status === 'In Progress' && isAdmin) {
            updates.isReviewed = true;
          } else if (sanitizedData.status !== 'In Progress') {
            updates.isReviewed = false;
          }
        }
        
        // If no actual changes, don't update
        if (Object.keys(updates).length === 0) {
            setIsOpen(false);
            setLoading(false);
            return;
        }

        updateDoc(taskRef, updates)
          .then(() => {
            toast({ title: 'Task Updated', description: `"${sanitizedData.name}" has been updated.` });
            setIsOpen(false);
          })
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: taskRef.path,
              operation: 'update',
              requestResourceData: updates,
            });
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        if (!sanitizedData.department) {
            toast({
                variant: 'destructive',
                title: 'Department required',
                description: 'Please select a department for the new task.',
            });
            setLoading(false);
            return;
        }

        const tasksInStatus = tasks.filter(t => t.status === sanitizedData.status);
        const newOrder = tasksInStatus.length;

        const newHistoryEntry: TaskHistoryEntry = {
            field: 'status',
            oldValue: null,
            newValue: sanitizedData.status,
            timestamp: new Date(),
            changedBy: currentUser.uid,
        };

        const intendedUserId = sanitizedData.userId || currentUser.uid;
        const isAssigningToOther = isAdmin && intendedUserId !== currentUser.uid;
        
        const creatorId = isAssigningToOther ? currentUser.uid : intendedUserId;

        const newTaskData = {
          ...sanitizedData,
          userId: creatorId,
          createdAt: serverTimestamp(),
          order: newOrder,
          history: [newHistoryEntry],
          doneAt: sanitizedData.status === 'Done' ? serverTimestamp() : null,
          isReviewed: false,
        };
        const tasksCollection = collection(db, 'tasks');

        addDoc(tasksCollection, newTaskData)
         .then(async (docRef) => {
            if (isAssigningToOther) {
                // Second step: update the userId to the intended user
                const historyUpdate: TaskHistoryEntry = {
                    field: 'userId',
                    oldValue: creatorId,
                    newValue: intendedUserId,
                    timestamp: new Date(),
                    changedBy: currentUser.uid,
                };
                await updateDoc(docRef, { 
                    userId: intendedUserId,
                    history: arrayUnion(historyUpdate)
                });
            }
            toast({ title: 'Task Created', description: `"${sanitizedData.name}" has been added to the board.` });
            setIsOpen(false);
          })
         .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: tasksCollection.path,
              operation: 'create',
              requestResourceData: newTaskData,
            });
            errorEmitter.emit('permission-error', permissionError);
          })
         .finally(() => {
            setLoading(false);
          });
      }
  };

  const handleReopen = async () => {
    if (!task || !db) return;
    setLoading(true);

    const taskRef = doc(db, 'tasks', task.id);
    const updates = {
      status: 'In Progress' as TaskStatus,
      order: tasks.filter(t => t.status === 'In Progress').length,
      history: arrayUnion({
        field: 'status',
        oldValue: task.status,
        newValue: 'In Progress',
        timestamp: new Date(),
        changedBy: appUser?.uid,
      }),
      doneAt: null,
      isReviewed: true,
    };

    updateDoc(taskRef, updates)
      .then(() => {
        toast({ title: 'Task Reopened', description: `"${task.name}" has been moved to In Progress.` });
        setIsOpen(false);
      })
      .catch((serverError) => {
         const permissionError = new FirestorePermissionError({
           path: taskRef.path,
           operation: 'update',
           requestResourceData: updates,
         });
         errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            setTask(undefined);
        }
        setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Edit Task: ${task.name}` : 'Create a new task'}</DialogTitle>
          {task?.status !== 'Archived' && (
            <DialogDescription>
                {isEditMode ? 'Update the details of your task.' : 'Fill out the form below to add a task to your board.'}
            </DialogDescription>
          )}
        </DialogHeader>
        {task?.status === 'Archived' ? (
          <div className="space-y-6">
             <div>
                <h3 className="font-medium">Task Details</h3>
                <p className="text-sm text-muted-foreground">This task is archived and read-only.</p>
             </div>
             <p><strong>Name:</strong> {task.name}</p>
             <p><strong>Department:</strong> {task.department}</p>
             <p><strong>Status:</strong> <span className="px-2 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground">Archived</span></p>
             <div>
                <strong>Comments:</strong>
                <div className="mt-1 p-3 rounded-md border bg-muted/50 max-h-48 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: task.comments }} />
                </div>
             </div>
             {(isAdmin) && (
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                    <Button onClick={handleReopen} disabled={loading}>
                       {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reopen Task
                    </Button>
                </DialogFooter>
             )}
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Design new homepage" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('userId', ''); // Reset user when department changes
                        }} 
                        value={field.value} 
                        disabled={!isAdmin && isEditMode}
                    >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a department" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {departments.map((dep) => (
                                <SelectItem key={dep.id} value={dep.name}>
                                    {dep.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isAdmin && (
                <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger disabled={!selectedDepartment}>
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {!selectedDepartment && <SelectItem value="" disabled>First select a department</SelectItem>}
                                {usersInDept.map((user) => (
                                    <SelectItem key={user.uid} value={user.uid}>
                                        {user.displayName} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={availableStatuses.length <= 1}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center mb-1">
                    <FormLabel>Comments</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSummarize}
                      disabled={aiLoading || !field.value}
                    >
                      {aiLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                      )}
                      AI Summary
                    </Button>
                  </div>
                  <RichTextToolbar editorRef={editorRef} />
                  <FormControl>
                    <RichTextEditor
                        ref={editorRef}
                        value={field.value}
                        onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { setIsOpen(false); setTask(undefined); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

    