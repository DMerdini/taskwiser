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

interface PinDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
}

export function PinDialog({
  isOpen,
  setIsOpen,
  onConfirm,
  title,
  description,
}: PinDialogProps) {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const newCode = Math.floor(1000 + Math.random() * 9000).toString();
      setConfirmationCode(newCode);
      setUserInput('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (userInput !== confirmationCode) {
      toast({
        variant: 'destructive',
        title: 'Incorrect PIN',
        description: 'The PIN you entered does not match.',
      });
      return;
    }
    onConfirm();
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4">
          <p className="text-sm text-muted-foreground">
            Enter PIN: <span className="font-mono text-lg text-destructive tracking-widest bg-destructive/10 px-2 py-1 rounded-md">{confirmationCode}</span>
          </p>
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type 4-digit PIN here"
            className="mt-2"
            aria-label="Confirmation PIN input"
            maxLength={4}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={userInput !== confirmationCode}
          >
            Confirm
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
