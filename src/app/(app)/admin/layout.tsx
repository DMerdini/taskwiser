'use client';
import React from 'react';
import useAuthentication from '@/hooks/use-authentication';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useAuthentication();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && appUser?.role !== 'sysadmin' && appUser?.role !== 'depadmin') {
      router.replace('/tasks');
    }
  }, [loading, appUser, router]);

  if (loading) {
    return <Skeleton className="w-full h-96 rounded-lg" />;
  }

  if (!loading && appUser?.role !== 'sysadmin' && appUser?.role !== 'depadmin') {
      return (
         <div className="flex flex-1 items-center justify-center bg-muted/40 p-4">
            <Alert variant="destructive" className="max-w-md">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to access this page. Redirecting...
                </AlertDescription>
            </Alert>
        </div>
      );
  }
  
  return <>{children}</>;
}
