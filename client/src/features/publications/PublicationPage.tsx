import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Search, Loader2, Eye, FileStack, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import type { Publication, PaginatedResponse } from '@/types';
import { withBasePath } from '@/lib/basePath';

export function PublicationPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [publishedFilter, setPublishedFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Publication | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Publication | null>(null);
  const [formData, setFormData] = useState({ publicationNumber: '', description: '', openDate: '' });

  const { data, isLoading } = useQuery<PaginatedResponse<Publication>>({
    queryKey: ['publications', debouncedSearch, publishedFilter, page],
    queryFn: async () => {
      const params: Record<string, any> = { search: debouncedSearch, page, limit: 20 };
      if (publishedFilter !== 'ALL') params.published = publishedFilter === 'PUBLISHED' ? 'true' : 'false';
      const { data } = await api.get('/publications', { params });
      return data;
    },
  });

  const totalPublications = data?.meta.total ?? 0;
  const publishedCount = data?.data.filter(b => b.isPublished).length ?? 0;
  const unpublishedCount = data?.data.filter(b => !b.isPublished).length ?? 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.put(`/publications/${editing.id}`, formData);
      } else {
        await api.post('/publications', formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      toast.success(editing ? 'Publication updated' : 'Publication created');
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save publication');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/publications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      toast.success('Publication deleted');
      setDeleteDialogOpen(false);
      setDeleting(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete publication');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormData({ publicationNumber: '', description: '', openDate: '' });
    setDialogOpen(true);
  };

  const openEdit = (publication: Publication) => {
    setEditing(publication);
    setFormData({
      publicationNumber: publication.publicationNumber,
      description: publication.description || '',
      openDate: publication.openDate ? publication.openDate.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormData({ publicationNumber: '', description: '', openDate: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.publicationNumber.trim()) {
      toast.error('Publication number is required');
      return;
    }
    if (!formData.openDate) {
      toast.error('Posting date is required');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Publications</h1>
          <p className="text-sm text-muted-foreground">Create publications and manage the positions posted within them</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.lgu?.slug && (
            <Button asChild variant="outline">
              <a href={withBasePath(`/${user.lgu.slug}/careers`)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Careers Page
              </a>
            </Button>
          )}
          {!isSuperAdmin && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Publication
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-primary/10 p-3">
              <FileStack className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPublications}</p>
              <p className="text-sm text-muted-foreground">Total Publications</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{publishedCount}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-orange-100 p-3">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unpublishedCount}</p>
              <p className="text-sm text-muted-foreground">Unpublished</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search publications..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={publishedFilter} onValueChange={(value) => { setPublishedFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="UNPUBLISHED">Unpublished</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Publication No.</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Posting Date</TableHead>
              <TableHead>Closing Date</TableHead>
              <TableHead>Positions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No publications found
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((publication) => (
                <TableRow key={publication.id}>
                  <TableCell className="font-medium">{publication.publicationNumber}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {publication.description || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(publication.openDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(publication.closeDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{publication._count?.positions ?? 0}</TableCell>
                  <TableCell>
                    {publication.isPublished ? (
                      <Badge className="bg-green-600 hover:bg-green-700">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Unpublished</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/rsp/publications/${publication.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isSuperAdmin && !publication.isPublished && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(publication)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setDeleting(publication); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
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
            <DialogTitle>{editing ? 'Edit Publication' : 'Create New Publication'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update publication details' : 'Create a new publication for position postings'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="publicationNumber">Publication Number *</Label>
                <Input
                  id="publicationNumber"
                  value={formData.publicationNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, publicationNumber: e.target.value }))}
                  placeholder="e.g., 2026-001"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openDate">Posting Date *</Label>
                  <Input
                    id="openDate"
                    type="date"
                    value={formData.openDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, openDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Closing Date</Label>
                  <Input
                    type="date"
                    value={formData.openDate ? (() => {
                      const d = new Date(formData.openDate);
                      d.setDate(d.getDate() + 15);
                      return d.toISOString().split('T')[0];
                    })() : ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated: 15 calendar days from posting date</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this publication"
                  rows={3}
                />
              </div>
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

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Publication</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete publication "{deleting?.publicationNumber}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
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
