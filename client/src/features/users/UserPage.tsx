import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { User, PaginatedResponse, Department, Lgu } from '@/types';

const userSchema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN']),
  departmentId: z.number().optional().nullable(),
  lguId: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  LGU_HR_ADMIN: 'HR Admin',
  LGU_OFFICE_ADMIN: 'Office Admin',
  APPLICANT: 'Applicant',
};

export function UserPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [filterLguId, setFilterLguId] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);

  // Fetch LGUs for SUPER_ADMIN
  const { data: lgus } = useQuery<Lgu[]>({
    queryKey: ['lgus-list'],
    queryFn: async () => {
      const { data } = await api.get('/lgus');
      return data.data;
    },
    enabled: isSuperAdmin,
  });

  const { data, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['users', debouncedSearch, page, filterLguId],
    queryFn: async () => {
      const params: any = { search: debouncedSearch, page, limit: 20 };
      if (filterLguId) params.lguId = filterLguId;
      const { data } = await api.get('/users', { params });
      return data;
    },
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data.data;
    },
  });

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const watchRole = watch('role');

  const saveMutation = useMutation({
    mutationFn: async (formData: UserFormData) => {
      const payload: any = { ...formData };
      if (!payload.password) delete payload.password;
      if (isSuperAdmin && formData.lguId) payload.lguId = Number(formData.lguId);
      else delete payload.lguId;
      if (editing) return api.put(`/users/${editing.id}`, payload);
      return api.post('/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(editing ? 'User updated' : 'User created');
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ email: '', username: '', password: '', firstName: '', lastName: '', role: 'LGU_HR_ADMIN', departmentId: null, lguId: '' });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    reset({
      email: user.email,
      username: user.username,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'LGU_HR_ADMIN' | 'LGU_OFFICE_ADMIN',
      departmentId: user.departmentId,
      lguId: user.lguId ? String(user.lguId) : '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); reset(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Manage user accounts</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        {isSuperAdmin && lgus && (
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filterLguId}
            onChange={(e) => { setFilterLguId(e.target.value); setPage(1); }}
          >
            <option value="">All LGUs</option>
            {lgus.map((lgu) => (
              <option key={lgu.id} value={lgu.id}>{lgu.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {isSuperAdmin && <TableHead>LGU</TableHead>}
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow><TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
            ) : (
              data?.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><Badge variant="outline">{roleLabels[user.role] || user.role}</Badge></TableCell>
                  {isSuperAdmin && <TableCell>{user.lgu?.name || '-'}</TableCell>}
                  <TableCell>{user.department?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}><Pencil className="h-4 w-4" /></Button>
                      {user.id !== currentUser?.id && (
                        <Button variant="ghost" size="icon" onClick={() => { setDeleting(user); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, data.meta.total)} of {data.meta.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.meta.totalPages}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>{editing ? 'Update user details' : 'Create a new user account'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input {...register('firstName')} />
                  {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input {...register('lastName')} />
                  {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input {...register('username')} />
                {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Password {editing ? '(leave blank to keep)' : '*'}</Label>
                <Input type="password" {...register('password')} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              {isSuperAdmin && !editing && (
                <div className="space-y-2">
                  <Label>LGU *</Label>
                  <select
                    {...register('lguId')}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Select LGU</option>
                    {lgus?.map((lgu) => (
                      <option key={lgu.id} value={lgu.id}>{lgu.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {isSuperAdmin && editing && (
                <div className="space-y-2">
                  <Label>LGU</Label>
                  <Input value={editing.lgu?.name || '-'} disabled />
                </div>
              )}
              <div className="space-y-2">
                <Label>Role *</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LGU_HR_ADMIN">HR Admin</SelectItem>
                        <SelectItem value="LGU_OFFICE_ADMIN">Office Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {watchRole === 'LGU_OFFICE_ADMIN' && (
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{deleting?.firstName} {deleting?.lastName}"?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleting && deleteMutation.mutate(deleting.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
