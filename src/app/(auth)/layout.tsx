'use client';
import useAuthentication from '@/hooks/use-authentication';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthentication();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user) {
      router.replace('/tasks');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
            <p className="text-muted-foreground">Redirecting...</p>
            <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>
  );
}
