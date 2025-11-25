'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CircleUser, ListChecks, LogOut, ShieldCheck, Archive, Menu, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import useAuthentication from '@/hooks/use-authentication';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { useTaskDialog } from '@/providers/task-dialog-provider';
import { TaskDialog } from '@/components/kanban/task-dialog';
import { useTasks } from '@/hooks/use-tasks';
import { useAuth } from '@/firebase';
import { ProfilePictureUploader } from '@/components/auth/profile-picture-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading } = useAuthentication();
  const { tasks, loading: tasksLoading } = useTasks();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { openNewTaskDialog } = useTaskDialog();
  const [isProfileUploaderOpen, setIsProfileUploaderOpen] = React.useState(false);


  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);
  
  const handleSignOut = async () => {
    if (!auth) return;
    await auth.signOut();
    router.push('/login');
  };

  const navLinks = [
    { href: '/tasks', label: 'Tasks' },
    { href: '/archive', label: 'Archive' },
    ...(appUser?.role === 'sysadmin' || appUser?.role === 'depadmin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ];
  
  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length > 1 && words[1]) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading || tasksLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <ListChecks className="h-6 w-6" />
            <span className="">TaskWise</span>
          </Link>
          <nav className="hidden md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 ml-6">
             <Skeleton className="h-8 w-20" />
             <Skeleton className="h-8 w-20" />
          </nav>
          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 justify-end">
             <Skeleton className="h-10 w-32" />
             <Skeleton className="h-10 w-24" />
             <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          <Skeleton className="w-full h-96 rounded-lg" />
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  
  if (!appUser) {
    return (
       <div className="flex min-h-screen flex-col">
           <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50 justify-between">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <ListChecks className="h-6 w-6" />
                    <span className="">TaskWise</span>
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                        <CircleUser className="h-5 w-5" />
                        <span className="sr-only">Toggle user menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
           </header>
           <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
              <div className="text-center">
               <p>Creating user profile...</p>
               <Skeleton className="w-64 h-4 mt-2" />
              </div>
           </main>
       </div>
   );
 }

 if (appUser.status === 'pending' || appUser.status === 'suspended') {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50 justify-between">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <ListChecks className="h-6 w-6" />
                    <span className="">TaskWise</span>
                </Link>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="flex items-center gap-2 rounded-full p-1 h-auto">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={appUser.photoURL || undefined} alt={appUser.displayName || 'User'} />
                                <AvatarFallback>{getInitials(appUser.displayName)}</AvatarFallback>
                            </Avatar>
                            <span className="hidden md:inline">{appUser.displayName}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuLabel>{appUser?.displayName || 'My Account'}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>{user.email}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
           </header>
            <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
                <Alert className="max-w-md" variant={appUser.status === 'suspended' ? 'destructive' : 'default'}>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>{appUser.status === 'pending' ? 'Account Pending Approval' : 'Account Suspended'}</AlertTitle>
                    <AlertDescription>
                        {appUser.status === 'pending'
                          ? 'Your account has been created but is awaiting administrator approval. Please check back later.'
                          : 'Your account has been suspended. Please contact an administrator for more information.'
                        }
                    </AlertDescription>
                    <Button onClick={handleSignOut} variant="link" className="p-0 h-auto mt-4 text-sm">Sign out</Button>
                </Alert>
            </main>
        </div>
    );
  }

  return (
    <>
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <ListChecks className="h-6 w-6" />
            <span className="sr-only">TaskWise</span>
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-foreground ${
                pathname.startsWith(link.href)
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="#"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <ListChecks className="h-6 w-6" />
                <span className="sr-only">TaskWise</span>
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors hover:text-foreground ${
                    pathname.startsWith(link.href)
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 justify-end">
            <Button onClick={openNewTaskDialog}>Create Task</Button>
            <ThemeToggleButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 rounded-full p-1 pr-2 h-auto">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={appUser.photoURL || undefined} alt={appUser.displayName || 'User'} />
                        <AvatarFallback>{getInitials(appUser.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden font-medium sm:inline-block">{appUser.displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{appUser?.displayName || 'My Account'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsProfileUploaderOpen(true)}>
                  <Camera className="mr-2 h-4 w-4" />
                  Change Picture
                </DropdownMenuItem>
                <DropdownMenuItem disabled>{user.email}</DropdownMenuItem>
                {(appUser?.role === 'sysadmin' || appUser?.role === 'depadmin') && (
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Admin Panel
                    </DropdownMenuItem>
                 )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
      </main>
      <TaskDialog tasks={tasks || []} />
    </div>
    <ProfilePictureUploader 
        isOpen={isProfileUploaderOpen} 
        setIsOpen={setIsProfileUploaderOpen} 
        user={appUser} 
    />
    </>
  );
}
