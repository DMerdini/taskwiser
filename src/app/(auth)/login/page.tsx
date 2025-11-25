'use client';
import { LoginForm } from '@/components/auth/login-form';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex flex-col gap-6">
       <Link href="/" className="flex items-center justify-center gap-2 text-xl font-semibold">
          <ListChecks className="h-6 w-6" />
          <span>TaskWise</span>
        </Link>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>
       {error === 'not_found' && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            User account not found. Please sign up or contact support.
          </AlertDescription>
        </Alert>
      )}
      <LoginForm />
    </div>
  );
}
