'use client';
import { useState, useEffect } from 'react';
import { UserTable } from '@/components/admin/user-table';
import type { AppUser } from '@/lib/types';
import { collection, onSnapshot, query, where, Query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, errorEmitter, FirestorePermissionError, useMemoFirebase } from '@/firebase';
import useAuthentication from '@/hooks/use-authentication';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DepartmentsAdminPage from '@/app/(app)/admin/departments/page';

export default function AdminPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useFirestore();
  const { appUser } = useAuthentication();

  const usersQuery = useMemoFirebase(() => {
    if (!db || !appUser) {
      return null;
    }
    if (appUser.role === 'sysadmin') {
      return collection(db, 'users');
    }
    if (appUser.role === 'depadmin' && appUser.department) {
      return query(collection(db, 'users'), where('department', '==', appUser.department));
    }
    return null;
  }, [db, appUser]);

  useEffect(() => {
    if (!usersQuery) {
        setUsers([]);
        setLoading(false);
        return;
    }

    const unsubscribe = onSnapshot(usersQuery, 
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        const q = usersQuery as Query;
        const path = (q as any)._query.path.canonicalString();

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path,
        });
        
        errorEmitter.emit('permission-error', contextualError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [usersQuery]);

  if (loading) {
    return (
        <>
            <h1 className="font-semibold text-lg md:text-2xl">User Management</h1>
            <div className="rounded-lg border p-4">
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full" />
            </div>
        </>
    );
  }

  return (
    <>
      <h1 className="font-semibold text-lg md:text-2xl mb-4">Admin Panel</h1>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          {appUser?.role === 'sysadmin' && <TabsTrigger value="departments">Departments</TabsTrigger>}
        </TabsList>
        <TabsContent value="users" className="mt-4">
          <UserTable users={users} setUsers={setUsers} />
        </TabsContent>
        {appUser?.role === 'sysadmin' && (
            <TabsContent value="departments" className="mt-4">
                <DepartmentsAdminPage />
            </TabsContent>
        )}
      </Tabs>
    </>
  );
}
