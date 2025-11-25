'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { Loader2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

const formSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters.'),
  depcolor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color (e.g., #RRGGBB).'),
});

type DepartmentFormValue = z.infer<typeof formSchema>;

export function AddDepartmentForm() {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<DepartmentFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      depcolor: '#',
    },
  });

  const onSubmit = async (data: DepartmentFormValue) => {
    if (!db) return;
    setLoading(true);

    const departmentsCol = collection(db, 'departments');

    addDoc(departmentsCol, data)
      .then(() => {
        toast({ title: 'Department Created', description: `"${data.name}" has been added.` });
        form.reset({ name: '', depcolor: '#' });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: departmentsCol.path,
          operation: 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Department</CardTitle>
        <CardDescription>Create a new department to organize users and tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Department Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Engineering" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depcolor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Color</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="p-1 h-10 w-12" disabled={loading} />
                      </FormControl>
                      <span className="font-mono text-muted-foreground">{field.value}</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={loading} type="submit">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Department
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
