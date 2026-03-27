import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Loader2, Upload, X, Shield, ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Lgu, PaginatedResponse } from '@/types';

const lguSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

type LguFormData = z.infer<typeof lguSchema>;

export function LguPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLgu, setEditingLgu] = useState<Lgu | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLgu, setDeletingLgu] = useState<Lgu | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerBgFile, setHeaderBgFile] = useState<File | null>(null);
  const [headerBgPreview, setHeaderBgPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<Lgu>>({
    queryKey: ['lgus', debouncedSearch, page],
    queryFn: async () => {
      const { data } = await api.get('/lgus', { params: { search: debouncedSearch, page, limit: 20 } });
      return data;
    },
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<LguFormData>({
    resolver: zodResolver(lguSchema),
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: LguFormData) => {
      let res;
      if (editingLgu) {
        res = await api.put(`/lgus/${editingLgu.id}`, formData);
      } else {
        res = await api.post('/lgus', formData);
      }
      const lguId = editingLgu?.id || res.data.data.id;
      // Upload logo if a new file was selected
      if (logoFile) {
        await uploadLogo(lguId);
      }
      // Upload header bg if a new file was selected
      if (headerBgFile) {
        await uploadHeaderBg(lguId);
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgus'] });
      toast.success(editingLgu ? 'LGU updated' : 'LGU created');
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save LGU');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/lgus/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgus'] });
      toast.success('LGU deleted');
      setDeleteDialogOpen(false);
      setDeletingLgu(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete LGU');
    },
  });

  const openCreate = () => {
    setEditingLgu(null);
    setLogoFile(null);
    setLogoPreview(null);
    setHeaderBgFile(null);
    setHeaderBgPreview(null);
    reset({ name: '', slug: '', address: '', contactNumber: '', email: '' });
    setDialogOpen(true);
  };

  const openEdit = (lgu: Lgu) => {
    setEditingLgu(lgu);
    setLogoFile(null);
    setLogoPreview(lgu.logo || null);
    setHeaderBgFile(null);
    setHeaderBgPreview(lgu.headerBg || null);
    reset({
      name: lgu.name,
      slug: lgu.slug,
      address: lgu.address || '',
      contactNumber: lgu.contactNumber || '',
      email: lgu.email || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingLgu(null);
    setLogoFile(null);
    setLogoPreview(null);
    setHeaderBgFile(null);
    setHeaderBgPreview(null);
    reset();
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (lguId: number) => {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      await api.post(`/lgus/${lguId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleHeaderBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    setHeaderBgFile(file);
    setHeaderBgPreview(URL.createObjectURL(file));
  };

  const uploadHeaderBg = async (lguId: number) => {
    if (!headerBgFile) return;
    const formData = new FormData();
    formData.append('headerBg', headerBgFile);
    await api.post(`/lgus/${lguId}/header-bg`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!editingLgu) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setValue('slug', slug);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">LGU Management</h1>
          <p className="text-sm text-muted-foreground">Manage Local Government Units</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add LGU
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search LGUs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Logo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No LGUs found
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((lgu) => (
                <TableRow key={lgu.id}>
                  <TableCell>
                    {lgu.logo ? (
                      <img src={lgu.logo} alt={lgu.name} className="h-8 w-8 rounded-full object-cover border" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                        <Shield className="h-4 w-4 text-emerald-600" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{lgu.name}</TableCell>
                  <TableCell className="text-muted-foreground">{lgu.slug}</TableCell>
                  <TableCell>{lgu.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={lgu.isActive ? 'default' : 'secondary'}>
                      {lgu.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(lgu)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setDeletingLgu(lgu); setDeleteDialogOpen(true); }}
                      >
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

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, data.meta.total)} of {data.meta.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.meta.totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLgu ? 'Edit LGU' : 'Add New LGU'}</DialogTitle>
            <DialogDescription>
              {editingLgu ? 'Update LGU details' : 'Create a new Local Government Unit'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
            <div className="space-y-4 py-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-full object-cover border-2 border-emerald-200" />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50">
                      <Shield className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
                      <Upload className="h-4 w-4" />
                      {logoPreview ? 'Change' : 'Upload'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">Max 2MB. Will be resized to 200x200.</p>
                  </div>
                </div>
              </div>

              {/* Header Background Upload */}
              <div className="space-y-2">
                <Label>Careers Page Header Background</Label>
                {headerBgPreview ? (
                  <div className="relative">
                    <img src={headerBgPreview} alt="Header preview" className="w-full h-24 rounded-md object-cover border" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                      onClick={() => { setHeaderBgFile(null); setHeaderBgPreview(null); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50">
                    <div className="text-center">
                      <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">No header background</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
                    <Upload className="h-4 w-4" />
                    {headerBgPreview ? 'Change' : 'Upload'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleHeaderBgSelect} />
                  </label>
                  <p className="text-xs text-muted-foreground">Max 5MB. Optimized to 1920x600 WebP.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register('name', { onChange: onNameChange })} placeholder="e.g., City of Cebu" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" {...register('slug')} placeholder="e.g., cebu-city" />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                <p className="text-xs text-muted-foreground">Used in URLs: /{'{slug}'}/careers, /{'{slug}'}/login</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input id="contactNumber" {...register('contactNumber')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending || uploadingLogo}>
                {(saveMutation.isPending || uploadingLogo) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingLgu ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete LGU</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingLgu?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingLgu && deleteMutation.mutate(deletingLgu.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
