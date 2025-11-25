'use client';

import { SignupForm } from '@/components/auth/signup-form';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
       <Link href="/" className="flex items-center justify-center gap-2 text-xl font-semibold">
          <ListChecks className="h-6 w-6" />
          <span>TaskWise</span>
        </Link>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your details below to create your account
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
