'use client';

import { useState, useEffect } from 'react';
import type { Department } from '@/lib/types';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { AddDepartmentForm } from '@/components/admin/department-form';
import { DepartmentTable } from '@/components/admin/department-table';
import { Skeleton } from '@/components/ui/skeleton';
import useAuthentication from '@/hooks/use-authentication';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function DepartmentsAdminPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const db = useFirestore();
    const { appUser } = useAuthentication();

    useEffect(() => {
        if (!db) return;
        setLoading(true);
        const unsubscribe = onSnapshot(collection(db, 'departments'), (snapshot) => {
            const deps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
            setDepartments(deps);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db]);
    
    if (appUser?.role !== 'sysadmin') {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be a system administrator to manage departments.
          </AlertDescription>
        </Alert>
      );
    }

    return (
        <div className="space-y-6">
            <AddDepartmentForm />
            {loading ? (
                <div className="rounded-lg border p-4">
                    <Skeleton className="h-8 w-full mb-4" />
                    <Skeleton className="h-8 w-full mb-2" />
                    <Skeleton className="h-8 w-full" />
                </div>
            ) : (
                <DepartmentTable departments={departments} />
            )}
        </div>
    );
}
