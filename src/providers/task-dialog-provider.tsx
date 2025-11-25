'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Task } from '@/lib/types';

interface TaskDialogContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  task: Task | undefined;
  setTask: (task: Task | undefined) => void;
  openNewTaskDialog: () => void;
}

const TaskDialogContext = createContext<TaskDialogContextType | undefined>(undefined);

export const TaskDialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [task, setTask] = useState<Task | undefined>(undefined);
  
  const openNewTaskDialog = useCallback(() => {
    setTask(undefined);
    setIsOpen(true);
  }, []);

  return (
    <TaskDialogContext.Provider value={{ isOpen, setIsOpen, task, setTask, openNewTaskDialog }}>
      {children}
    </TaskDialogContext.Provider>
  );
};

export const useTaskDialog = () => {
  const context = useContext(TaskDialogContext);
  if (context === undefined) {
    throw new Error('useTaskDialog must be used within a TaskDialogProvider');
  }
  return context;
};
