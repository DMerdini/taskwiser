'use client';
import React from 'react';
import TaskCard from './task-card';
import type { Task } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    tasks: Task[];
  };
  draggedTaskId: string | null;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  draggedTaskId,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      className="flex flex-col bg-card rounded-lg shadow-sm h-full max-h-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">{column.title}</h2>
          <span className="text-sm font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">
            {column.tasks.length}
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="task-list p-2 space-y-2">
            {column.tasks.map((task) => (
            <TaskCard
                key={task.id}
                task={task}
                isDragged={draggedTaskId === task.id}
                onDragStart={(e) => onDragStart(e, task.id)}
            />
            ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default KanbanColumn;
