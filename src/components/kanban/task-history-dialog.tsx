'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { TaskHistoryEntry, AppUser } from '@/lib/types';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, User, FileText, Building, Tag } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where, documentId, Timestamp } from 'firebase/firestore';

interface TaskHistoryDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  taskName: string;
  history?: TaskHistoryEntry[];
}

const fieldIcons: Record<string, React.ReactNode> = {
    name: <FileText className="h-4 w-4" />,
    department: <Building className="h-4 w-4" />,
    userId: <User className="h-4 w-4" />,
    status: <Tag className="h-4 w-4" />,
    comments: <FileText className="h-4 w-4" />,
};

const FieldName: Record<string, string> = {
    name: 'Name',
    department: 'Department',
    userId: 'Assignee',
    status: 'Status',
    comments: 'Comments',
}


export function TaskHistoryDialog({
  isOpen,
  setIsOpen,
  taskName,
  history,
}: TaskHistoryDialogProps) {
  const db = useFirestore();
  const [users, setUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && history && history.length > 0 && db) {
      const userIds = Array.from(new Set(history.map(h => h.changedBy).filter(Boolean))) as string[];
      if (userIds.length > 0) {
        const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', userIds));
        getDocs(usersQuery).then(snapshot => {
          const userMap: Record<string, string> = {};
          snapshot.forEach(doc => {
            const userData = doc.data() as AppUser;
            userMap[doc.id] = userData.displayName || 'Unknown User';
          });
          setUsers(userMap);
        });
      }
    }
  }, [isOpen, history, db]);

  const toDate = (timestamp: Timestamp | Date): Date => {
    if (timestamp instanceof Date) return timestamp;
    return timestamp.toDate();
  }

  const sortedHistory = history
    ? [...history].sort((a, b) => {
        const dateA = toDate(a.timestamp);
        const dateB = toDate(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      })
    : [];
    
  const renderChange = (entry: TaskHistoryEntry) => {
    const { field, oldValue, newValue } = entry;
    
    if (field === 'comments') {
        return <p>Comments were updated.</p>
    }

    if (field === 'userId') {
        const oldUserName = users[oldValue] || oldValue?.substring(0, 8) || 'Unassigned';
        const newUserName = users[newValue] || newValue?.substring(0, 8) || 'Unassigned';
        return <p><strong>{FieldName[field]}</strong> changed from <strong>{oldUserName}</strong> to <strong>{newUserName}</strong>.</p>
    }
    
    return <p><strong>{FieldName[field]}</strong> changed from "<strong>{oldValue || 'none'}</strong>" to "<strong>{newValue}</strong>".</p>
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>History for "{taskName}"</DialogTitle>
          <DialogDescription>
            A log of all changes for this task.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 w-full">
          {sortedHistory.length > 0 ? (
            <div className="relative pl-6 py-4">
              <div className="absolute top-4 left-[15px] h-full w-0.5 bg-border" />
              {sortedHistory.map((entry, index) => {
                const date = toDate(entry.timestamp);
                const isDateValid = !isNaN(date.getTime());
                
                return (
                  <div key={index} className="relative pb-8">
                    <div className="absolute top-0.5 left-[15px] -ml-px h-full w-0.5" />
                    <div className="relative flex items-start gap-4">
                        <div className="absolute top-0 left-0 h-8 w-8 rounded-full bg-primary/10 border-4 box-content border-background z-10 flex items-center justify-center text-primary">
                            {fieldIcons[entry.field] || <History />}
                        </div>
                        <div className="pl-12">
                            <div className="font-normal text-sm text-foreground">
                               {renderChange(entry)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                by {entry.changedBy ? users[entry.changedBy] || 'Unknown' : 'System'}
                                {' on '}
                                {isDateValid ? format(date, 'MMM d, yyyy, h:mm a') : 'A few moments ago'}
                            </p>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <History className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-4">
                No history available for this task.
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
