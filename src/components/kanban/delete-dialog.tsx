'use client';
import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc } from 'firebase/firestore';
import { Button } from '../ui/button';
import { useFirestore } from '@/firebase';

interface DeleteDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  taskId: string;
  taskName: string;
  onTaskDeleted: (taskId: string) => void;
}

export function DeleteDialog({
  isOpen,
  setIsOpen,
  taskId,
  taskName,
  onTaskDeleted,
}: DeleteDialogProps) {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const { toast } = useToast();
  const db = useFirestore();

  useEffect(() => {
    if (isOpen) {
      const newCode = Math.floor(1000 + Math.random() * 9000).toString();
      setConfirmationCode(newCode);
      setUserInput('');
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (userInput !== confirmationCode) {
      toast({
        variant: 'destructive',
        title: 'Incorrect Code',
        description: 'The code you entered does not match.',
      });
      return;
    }
    if (!db) return;
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      onTaskDeleted(taskId);
      toast({
        title: 'Task Deleted',
        description: `"${taskName}" has been permanently deleted.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Could not delete task: ${error.message}`,
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. To permanently delete the task{' '}
            <strong>{taskName}</strong>, please type the code below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4">
          <p className="text-sm text-muted-foreground">
            Enter code: <span className="font-mono text-lg text-destructive tracking-widest bg-destructive/10 px-2 py-1 rounded-md">{confirmationCode}</span>
          </p>
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type code here"
            className="mt-2"
            aria-label="Confirmation code input"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={userInput !== confirmationCode}
          >
            Delete Task
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
