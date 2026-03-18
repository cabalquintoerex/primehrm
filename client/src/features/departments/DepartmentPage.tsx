import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Department, Lgu } from '@/types';

const deptSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  lguId: z.string().optional(),
});

type DeptFormData = z.infer<typeof deptSchema>;

export function DepartmentPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [search, setSearch] = useState('');
  const [filterLguId, setFilterLguId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Department | null>(null);

  // Fetch LGUs for SUPER_ADMIN filter and form select
  const { data: lgus } = useQuery<Lgu[]>({
    queryKey: ['lgus-list'],
    queryFn: async () => {
      const { data } = await api.get('/lgus');
      return data.data;
    },
    enabled: isSuperAdmin,
  });

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ['departments', search, filterLguId],
    queryFn: async () => {
      const params: any = { search };
      if (filterLguId) params.lguId = filterLguId;
      const { data } = await api.get('/departments', { params });
      return data.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DeptFormData>({
    resolver: zodResolver(deptSchema),
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: DeptFormData) => {
      const payload: any = { name: formData.name, code: formData.code };
      if (isSuperAdmin && formData.lguId) payload.lguId = Number(formData.lguId);
      if (editing) return api.put(`/departments/${editing.id}`, payload);
      return api.post('/departments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success(editing ? 'Department updated' : 'Department created');
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save department');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted');
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    },
  });

  const openCreate = () => { setEditing(null); reset({ name: '', code: '', lguId: '' }); setDialogOpen(true); };
  const openEdit = (dept: Department) => { setEditing(dept); reset({ name: dept.name, code: dept.code || '', lguId: dept.lguId ? String(dept.lguId) : '' }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); reset(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">Manage departments and offices</p>
        </div>
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'LGU_HR_ADMIN') && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search departments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isSuperAdmin && lgus && (
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filterLguId}
            onChange={(e) => setFilterLguId(e.target.value)}
          >
            <option value="">All LGUs</option>
            {lgus.map((lgu) => (
              <option key={lgu.id} value={lgu.id}>{lgu.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              {user?.role === 'SUPER_ADMIN' && <TableHead>LGU</TableHead>}
              <TableHead>Users</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : departments?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No departments found</TableCell></TableRow>
            ) : (
              departments?.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{dept.code || '-'}</TableCell>
                  {user?.role === 'SUPER_ADMIN' && <TableCell>{dept.lgu?.name || '-'}</TableCell>}
                  <TableCell>{dept._count?.users || 0}</TableCell>
                  <TableCell>
                    <Badge variant={dept.isActive ? 'default' : 'secondary'}>{dept.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleting(dept); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>{editing ? 'Update department details' : 'Create a new department'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register('name')} placeholder="e.g., Human Resource Office" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" {...register('code')} placeholder="e.g., HRO" />
              </div>
              {isSuperAdmin && !editing && (
                <div className="space-y-2">
                  <Label htmlFor="lguId">LGU *</Label>
                  <select
                    id="lguId"
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
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{deleting?.name}"?</DialogDescription>
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
