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
import { Button } from '../ui/button';

interface SysAdminDeleteDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onConfirmDelete: () => Promise<void>;
}

export function SysAdminDeleteDialog({
  isOpen,
  setIsOpen,
  onConfirmDelete,
}: SysAdminDeleteDialogProps) {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Generate a 6-digit PIN
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      setConfirmationCode(newCode);
      setUserInput('');
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (userInput !== confirmationCode) {
      toast({
        variant: 'destructive',
        title: 'Incorrect PIN',
        description: 'The PIN you entered does not match.',
      });
      return;
    }
    await onConfirmDelete();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>SysAdmin Action: Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            This action is irreversible and will permanently delete ALL tasks across ALL departments. To proceed, please type the 6-digit PIN below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4">
          <p className="text-sm text-muted-foreground">
            Enter PIN: <span className="font-mono text-lg text-destructive tracking-widest bg-destructive/10 px-2 py-1 rounded-md">{confirmationCode}</span>
          </p>
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type 6-digit PIN here"
            className="mt-2"
            aria-label="Confirmation PIN input"
            maxLength={6}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={userInput !== confirmationCode}
          >
            Permanently Delete All Tasks
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
