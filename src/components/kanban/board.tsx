'use client';
import React, { useState } from 'react';
import KanbanColumn from './column';
import type { Task } from '@/lib/types';
import { useTaskDialog } from '@/providers/task-dialog-provider';

interface KanbanBoardProps {
  columns: {
    id: string;
    title: string;
    tasks: Task[];
  }[];
  onTaskDrop: (taskId: string, newStatusId: string, newIndex: number) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  onTaskDrop,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    const columnElement = e.currentTarget.querySelector('.task-list');
    if (!columnElement) return;
    
    const dropY = e.clientY;
    const cards = Array.from(columnElement.children) as HTMLDivElement[];

    let newIndex = cards.length;
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (card.id === taskId) continue;
        const rect = card.getBoundingClientRect();
        if (dropY < rect.top + rect.height / 2) {
            newIndex = i;
            break;
        }
    }
    
    onTaskDrop(taskId, columnId, newIndex);
    setDraggedTaskId(null);
  };

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-12rem)] pb-4">
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          draggedTaskId={draggedTaskId}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        />
      ))}
    </div>
  );
};

export default KanbanBoard;
