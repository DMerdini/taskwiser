'use client';
import type { Timestamp } from "firebase/firestore";

export const taskStatuses = ['In Progress', 'To Be Reviewed', 'Deprecated', 'Done', 'Archived'] as const;

export type TaskStatus = typeof taskStatuses[number];

export const statusToId: Record<TaskStatus, string> = {
  'In Progress': 'progress-tasks',
  'To Be Reviewed': 'to-be-reviewed-tasks',
  'Deprecated': 'deprecated-tasks',
  'Done': 'done-tasks',
  'Archived': 'archived-tasks',
};

export const idToStatus: Record<string, TaskStatus> = {
  'progress-tasks': 'In Progress',
  'to-be-reviewed-tasks': 'To Be Reviewed',
  'deprecated-tasks': 'Deprecated',
  'done-tasks': 'Done',
  'archived-tasks': 'Archived',
};

export type TaskHistoryEntry = {
  timestamp: Timestamp | Date;
  changedBy?: string; // UID of user who made the change
  field: 'name' | 'department' | 'userId' | 'comments' | 'status';
  oldValue: any;
  newValue: any;
};

export type Task = {
  id: string;
  name: string;
  department: string;
  depcolor?: string;
  comments: string;
  status: TaskStatus;
  createdAt: Timestamp | Date;
  userId: string;
  order: number;
  history?: TaskHistoryEntry[];
  doneAt?: Timestamp | null;
  isReviewed?: boolean;
};

export const userRoles = ['user', 'depadmin', 'sysadmin'] as const;
export type AppUserRole = typeof userRoles[number];

export const userStatuses = ['pending', 'approved', 'suspended'] as const;
export type AppUserStatus = typeof userStatuses[number];

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role: AppUserRole;
  status: AppUserStatus;
  department?: string;
};

export type Department = {
    id: string;
    name: string;
    depcolor: string;
};
