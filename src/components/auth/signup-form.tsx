'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const formSchema = z
  .object({
    displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email.' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string(),
    honeypot: z.string().optional(), // Honeypot field
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

type UserFormValue = z.infer<typeof formSchema>;

export function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: UserFormValue) => {
    // 1. Check the honeypot field
    if (data.honeypot) {
      console.log('Bot submission detected!');
      // Silently fail or show a generic error
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: "An unexpected error occurred."
      });
      return;
    }

    if (!auth || !db) {
        toast({
            variant: 'destructive',
            title: 'Firebase not initialized',
            description: 'The application is not connected to Firebase services.',
        });
        return;
    }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      
      await updateProfile(userCredential.user, {
        displayName: data.displayName
      });
      
      const isSysAdmin = data.email.toLowerCase() === 'deivismerdini@gmail.com';
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        displayName: data.displayName,
        email: data.email,
        role: isSysAdmin ? 'sysadmin' : 'user',
        status: isSysAdmin ? 'approved' : 'pending',
        createdAt: serverTimestamp()
      });
      
      await auth.signOut();

      if (isSysAdmin) {
         router.push('/login');
         toast({
            title: 'Admin Account Created',
            description: 'Your admin account has been created. You can now log in.',
         });
      } else {
        router.push('/login');
        toast({
            title: 'Account Created',
            description: 'Your account is pending approval. You can log in once it has been approved by an administrator.',
        });
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.code === 'auth/email-already-in-use' 
          ? 'This email is already associated with an account.'
          : error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    disabled={loading}
                    {...field}
                    defaultValue="Devis Merdini"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    disabled={loading}
                    {...field}
                    defaultValue="deivismerdini@gmail.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    disabled={loading}
                    {...field}
                    defaultValue="Asd123!@#"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    disabled={loading}
                    {...field}
                     defaultValue="Asd123!@#"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Honeypot Field: Visually hidden but available to bots */}
          <FormField
            control={form.control}
            name="honeypot"
            render={({ field }) => (
              <FormItem className="absolute w-px h-px overflow-hidden -m-px p-0 border-0">
                <FormLabel>Leave this field blank</FormLabel>
                <FormControl>
                  <Input autoComplete="off" tabIndex={-1} {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          
          <Button disabled={loading} className="w-full" type="submit">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </Form>
      <p className="mt-4 px-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign In
        </Link>
        .
      </p>
    </>
  );
}
