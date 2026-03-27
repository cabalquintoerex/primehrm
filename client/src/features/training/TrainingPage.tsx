import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Search, Loader2, GraduationCap, Clock, PlayCircle, CheckCircle, Eye } from 'lucide-react';
import { SuggestionInput, SuggestionTextarea } from '@/components/ui/suggestion-input';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import type { Training, TrainingStatus, TrainingType, PaginatedResponse } from '@/types';

const trainingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['MANAGERIAL', 'SUPERVISORY', 'TECHNICAL', 'FOUNDATION']),
  venue: z.string().optional(),
  conductedBy: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  numberOfHours: z.coerce.number().positive().optional().or(z.literal('')),
});

type TrainingFormData = z.infer<typeof trainingSchema>;

const STATUS_CONFIG: Record<TrainingStatus, { label: string; className: string }> = {
  UPCOMING: { label: 'Upcoming', className: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' },
  ONGOING: { label: 'Ongoing', className: 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500 hover:bg-red-600 text-white border-transparent' },
};

const TYPE_LABELS: Record<TrainingType, string> = {
  MANAGERIAL: 'Managerial',
  SUPERVISORY: 'Supervisory',
  TECHNICAL: 'Technical',
  FOUNDATION: 'Foundation',
};

export function TrainingPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTraining, setDeletingTraining] = useState<Training | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Training>>({
    queryKey: ['trainings', debouncedSearch, statusFilter, typeFilter, page],
    queryFn: async () => {
      const params: Record<string, any> = { search: debouncedSearch, page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      const { data } = await api.get('/trainings', { params });
      return data;
    },
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<TrainingFormData>({
    resolver: zodResolver(trainingSchema),
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: TrainingFormData) => {
      const payload = {
        ...formData,
        description: formData.description || null,
        venue: formData.venue || null,
        conductedBy: formData.conductedBy || null,
        numberOfHours: formData.numberOfHours === '' ? null : formData.numberOfHours || null,
      };
      if (editingTraining) {
        return api.put(`/trainings/${editingTraining.id}`, payload);
      }
      return api.post('/trainings', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success(editingTraining ? 'Training updated' : 'Training created');
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save training');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/trainings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Training deleted');
      setDeleteDialogOpen(false);
      setDeletingTraining(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete training');
    },
  });

  const openCreate = () => {
    setEditingTraining(null);
    reset({
      title: '', description: '', type: 'TECHNICAL', venue: '', conductedBy: '',
      startDate: '', endDate: '', numberOfHours: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (training: Training) => {
    setEditingTraining(training);
    reset({
      title: training.title,
      description: training.description || '',
      type: training.type,
      venue: training.venue || '',
      conductedBy: training.conductedBy || '',
      startDate: training.startDate ? training.startDate.split('T')[0] : '',
      endDate: training.endDate ? training.endDate.split('T')[0] : '',
      numberOfHours: training.numberOfHours != null ? Number(training.numberOfHours) : '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTraining(null);
    reset();
  };

  // Stats
  const stats = data?.data ? {
    total: data.meta.total,
    upcoming: data.data.filter((t) => t.status === 'UPCOMING').length,
    ongoing: data.data.filter((t) => t.status === 'ONGOING').length,
    completed: data.data.filter((t) => t.status === 'COMPLETED').length,
  } : { total: 0, upcoming: 0, ongoing: 0, completed: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Training Programs</h1>
          <p className="text-sm text-muted-foreground">Manage learning and development programs</p>
        </div>
        {!isSuperAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Training
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <PlayCircle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{stats.ongoing}</p>
              <p className="text-xs text-muted-foreground">Ongoing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search trainings..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="ONGOING">Ongoing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="MANAGERIAL">Managerial</SelectItem>
            <SelectItem value="SUPERVISORY">Supervisory</SelectItem>
            <SelectItem value="TECHNICAL">Technical</SelectItem>
            <SelectItem value="FOUNDATION">Foundation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No training programs found
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((training) => (
                <TableRow key={training.id}>
                  <TableCell className="font-medium">{training.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[training.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{training.venue || '-'}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(training.startDate), 'MMM d, yyyy')}
                    {' - '}
                    {format(new Date(training.endDate), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{training.numberOfHours != null ? Number(training.numberOfHours) : '-'}</TableCell>
                  <TableCell>{training._count?.participants ?? 0}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_CONFIG[training.status].className}>
                      {STATUS_CONFIG[training.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/training/${training.id}`)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        View
                      </Button>
                      {!isSuperAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(training)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {!isSuperAdmin && training.status === 'UPCOMING' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setDeletingTraining(training); setDeleteDialogOpen(true); }}
                        >
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

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, data.meta.total)} of {data.meta.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTraining ? 'Edit Training' : 'Add New Training'}</DialogTitle>
            <DialogDescription>
              {editingTraining ? 'Update training program details' : 'Create a new training program'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
            <div className="max-h-[70vh] overflow-y-auto space-y-4 py-4 px-1">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <SuggestionInput id="title" {...register('title')} suggestion="Leadership Development Program" />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <SuggestionTextarea id="description" {...register('description')} rows={3} suggestion="A comprehensive training program designed to enhance the competencies and skills of government employees." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGERIAL">Managerial</SelectItem>
                          <SelectItem value="SUPERVISORY">Supervisory</SelectItem>
                          <SelectItem value="TECHNICAL">Technical</SelectItem>
                          <SelectItem value="FOUNDATION">Foundation</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfHours">Number of Hours</Label>
                  <SuggestionInput id="numberOfHours" type="number" step="0.5" {...register('numberOfHours')} suggestion="40" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <SuggestionInput id="venue" {...register('venue')} suggestion="City Hall Conference Room" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conductedBy">Conducted By</Label>
                  <SuggestionInput id="conductedBy" {...register('conductedBy')} suggestion="CSC Regional Office VII" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input id="startDate" type="date" {...register('startDate')} />
                  {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input id="endDate" type="date" {...register('endDate')} />
                  {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTraining ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Training</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingTraining?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingTraining && deleteMutation.mutate(deletingTraining.id)}
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
