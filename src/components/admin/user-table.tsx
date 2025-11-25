'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AppUser, Department, AppUserRole, AppUserStatus } from '@/lib/types';
import { userRoles, userStatuses } from '@/lib/types';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useAuthentication from '@/hooks/use-authentication';
import { PinDialog } from './pin-dialog';

interface UserTableProps {
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
}

export function UserTable({ users, setUsers }: UserTableProps) {
  const db = useFirestore();
  const { appUser } = useAuthentication();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});

  const [pinState, setPinState] = useState<{
    isOpen: boolean;
    user: AppUser | null;
    newStatus: AppUserStatus | null;
  }>({ isOpen: false, user: null, newStatus: null });

  useEffect(() => {
    if (!db) return;
    const fetchDepartments = async () => {
        const departmentsCol = collection(db, 'departments');
        const departmentsSnapshot = await getDocs(departmentsCol);
        const departmentsList = departmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
        setDepartments(departmentsList);
    };
    fetchDepartments();
  }, [db]);

  const handleUpdate = (uid: string, updates: Partial<AppUser>) => {
    if (!db) return;
    setLoadingStates(prev => ({ ...prev, [uid]: true }));

    const userRef = doc(db, 'users', uid);
    updateDoc(userRef, updates)
      .then(() => {
        setUsers(prevUsers => prevUsers.map(user =>
          user.uid === uid ? { ...user, ...updates } : user
        ));
        toast({ title: 'User Updated', description: 'User details have been saved.' });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updates,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoadingStates(prev => ({ ...prev, [uid]: false }));
      });
  };

  const handleStatusChangeRequest = (user: AppUser, newStatus: AppUserStatus) => {
    if (user.status === newStatus) return;
    setPinState({ isOpen: true, user, newStatus });
  };
  
  const handleConfirmStatusChange = () => {
    if (!pinState.user || !pinState.newStatus) return;
    handleUpdate(pinState.user.uid, { status: pinState.newStatus });
  };

  const handleApprove = (user: AppUser) => {
    if (!user.department) {
      toast({
        variant: 'destructive',
        title: 'Department required',
        description: 'Please assign a department before approving the user.',
      });
      return;
    }
    handleUpdate(user.uid, { status: 'approved' });
  };
  
  const canEdit = (userToEdit: AppUser) => {
      if (!appUser) return false;
      if (appUser.role === 'sysadmin') return true;
      if (appUser.role === 'depadmin' && appUser.department === userToEdit.department && userToEdit.role !== 'sysadmin') return true;
      return false;
  };

  return (
    <>
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>
                 {canEdit(user) ? (
                    <Select
                        value={user.role}
                        onValueChange={(newRole) => handleUpdate(user.uid, { role: newRole as AppUserRole })}
                        disabled={loadingStates[user.uid]}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {userRoles.map(role => (
                                <SelectItem key={role} value={role} disabled={appUser?.role === 'depadmin' && role === 'sysadmin'}>{role}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 ) : (
                    <Badge variant={user.role === 'sysadmin' ? 'default' : 'secondary'}>
                        {user.role}
                    </Badge>
                 )}
              </TableCell>
              <TableCell>
                 {canEdit(user) ? (
                    <Select
                        value={user.department || ''}
                        onValueChange={(newDepartment) => handleUpdate(user.uid, { department: newDepartment })}
                        disabled={loadingStates[user.uid] || appUser?.role === 'depadmin'}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Assign department" />
                        </SelectTrigger>
                        <SelectContent>
                            {departments.map(dep => (
                                <SelectItem key={dep.id} value={dep.name}>{dep.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 ) : (
                    user.department || 'N/A'
                 )}
              </TableCell>
              <TableCell>
                 {user.status === 'pending' ? (
                     <Badge variant="destructive">pending</Badge>
                 ) : canEdit(user) ? (
                    <Select
                        value={user.status}
                        onValueChange={(newStatus) => handleStatusChangeRequest(user, newStatus as AppUserStatus)}
                        disabled={loadingStates[user.uid]}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(userStatuses.filter(s => s !== 'pending')).map(status => (
                                <SelectItem key={status} value={status}>
                                    <Badge
                                      variant={status === 'approved' ? 'outline' : 'destructive'}
                                      className={status === 'approved' ? 'text-green-600 border-green-600' : ''}
                                    >
                                      {status}
                                    </Badge>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 ) : (
                    <Badge
                        variant={user.status === 'approved' ? 'outline' : 'destructive'}
                        className={user.status === 'approved' ? 'text-green-600 border-green-600' : ''}
                    >
                        {user.status}
                    </Badge>
                 )}
              </TableCell>
              <TableCell className="text-right">
                {user.status === 'pending' && canEdit(user) && (
                  <Button
                    size="sm"
                    onClick={() => handleApprove(user)}
                    disabled={loadingStates[user.uid] || !user.department}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {loadingStates[user.uid] ? 'Approving...' : 'Approve'}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    {pinState.user && pinState.newStatus && (
        <PinDialog
            isOpen={pinState.isOpen}
            setIsOpen={(isOpen) => setPinState(prev => ({...prev, isOpen}))}
            onConfirm={handleConfirmStatusChange}
            title="Confirm Status Change"
            description={
                <span>
                    Are you sure you want to change the status of <strong>{pinState.user.email}</strong> to <strong className={pinState.newStatus === 'suspended' ? 'text-destructive' : 'text-green-600'}>{pinState.newStatus}</strong>?
                </span>
            }
        />
    )}
    </>
  );
}
