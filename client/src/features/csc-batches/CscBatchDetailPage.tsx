import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Plus, Trash2, Globe, XCircle, FileDown, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { generateCSCBatchForm } from '@/lib/generateCSCBatchForm';
import { generateCSCBatchExcel } from '@/lib/generateCSCBatchExcel';
import { useAuthStore } from '@/stores/authStore';
import type { CscPublicationBatch, Position, PaginatedResponse } from '@/types';

export function CscBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPositionIds, setSelectedPositionIds] = useState<number[]>([]);

  const { data: batch, isLoading } = useQuery<CscPublicationBatch>({
    queryKey: ['csc-batch', id],
    queryFn: async () => {
      const { data } = await api.get(`/csc-batches/${id}`);
      return data.data;
    },
  });

  // Fetch available positions (OPEN status, not in any batch)
  const { data: availablePositions, isLoading: loadingPositions } = useQuery<Position[]>({
    queryKey: ['available-positions-for-batch'],
    queryFn: async () => {
      const { data } = await api.get('/positions', { params: { status: 'OPEN', limit: 100 } });
      return (data.data as Position[]).filter((p: Position) => !p.cscBatchId);
    },
    enabled: addDialogOpen,
  });

  const publishMutation = useMutation({
    mutationFn: async () => api.put(`/csc-batches/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csc-batch', id] });
      queryClient.invalidateQueries({ queryKey: ['csc-batches'] });
      toast.success('Batch published successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to publish batch');
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => api.put(`/csc-batches/${id}/unpublish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csc-batch', id] });
      queryClient.invalidateQueries({ queryKey: ['csc-batches'] });
      toast.success('Batch unpublished');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unpublish batch');
    },
  });

  const addPositionsMutation = useMutation({
    mutationFn: async (positionIds: number[]) => {
      await api.post(`/csc-batches/${id}/positions`, { positionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csc-batch', id] });
      queryClient.invalidateQueries({ queryKey: ['available-positions-for-batch'] });
      toast.success('Positions added to batch');
      setAddDialogOpen(false);
      setSelectedPositionIds([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add positions');
    },
  });

  const removePositionMutation = useMutation({
    mutationFn: async (positionId: number) => {
      await api.delete(`/csc-batches/${id}/positions/${positionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csc-batch', id] });
      toast.success('Position removed from batch');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove position');
    },
  });

  const togglePosition = (positionId: number) => {
    setSelectedPositionIds(prev =>
      prev.includes(positionId)
        ? prev.filter(id => id !== positionId)
        : [...prev, positionId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Batch not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/csc-batches')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Batch {batch.batchNumber}</h1>
            {batch.isPublished ? (
              <Badge className="bg-green-600 hover:bg-green-700">Published</Badge>
            ) : (
              <Badge variant="secondary">Unpublished</Badge>
            )}
          </div>
          {batch.description && (
            <p className="text-sm text-muted-foreground mt-1">{batch.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => generateCSCBatchForm(batch)}
            disabled={!batch.positions || batch.positions.length === 0}
            title={!batch.positions || batch.positions.length === 0 ? 'Add positions first' : 'Export CS Form No. 9'}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => generateCSCBatchExcel(batch)}
            disabled={!batch.positions || batch.positions.length === 0}
            title={!batch.positions || batch.positions.length === 0 ? 'Add positions first' : 'Export CS Form No. 9 as Excel'}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          {!isSuperAdmin && (batch.isPublished ? (
            <Button
              variant="outline"
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending}
            >
              {unpublishMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Unpublish
            </Button>
          ) : (
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              Mark as Published
            </Button>
          ))}
        </div>
      </div>

      {/* Batch Info */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batch.positions?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Posting Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{new Date(batch.openDate).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closing Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{new Date(batch.closeDate).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Created By</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {batch.creator ? `${batch.creator.firstName} ${batch.creator.lastName}` : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {batch.isPublished ? 'Published At' : 'Created At'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {batch.isPublished && batch.publishedAt
                ? new Date(batch.publishedAt).toLocaleDateString()
                : new Date(batch.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Positions in this Batch</h2>
        {!isSuperAdmin && (
          <Button variant="outline" onClick={() => { setSelectedPositionIds([]); setAddDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Positions
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Item No.</TableHead>
              <TableHead>Salary Grade</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!batch.positions || batch.positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No positions in this batch
                </TableCell>
              </TableRow>
            ) : (
              batch.positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">{position.title}</TableCell>
                  <TableCell className="text-muted-foreground">{position.itemNumber || '-'}</TableCell>
                  <TableCell>{position.salaryGrade ?? '-'}</TableCell>
                  <TableCell>{position.department?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={position.status === 'OPEN' ? 'default' : 'secondary'}>
                      {position.status}
                    </Badge>
                  </TableCell>
                  {!isSuperAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePositionMutation.mutate(position.id)}
                        disabled={removePositionMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Positions Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Positions to Batch</DialogTitle>
            <DialogDescription>
              Select open positions to add to this CSC publication batch.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {loadingPositions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !availablePositions || availablePositions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No available positions. Only OPEN positions without an existing batch assignment are shown.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Item No.</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availablePositions.map((position) => (
                    <TableRow
                      key={position.id}
                      className="cursor-pointer"
                      onClick={() => togglePosition(position.id)}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedPositionIds.includes(position.id)}
                          onChange={() => togglePosition(position.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{position.title}</TableCell>
                      <TableCell className="text-muted-foreground">{position.itemNumber || '-'}</TableCell>
                      <TableCell>{position.department?.name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addPositionsMutation.mutate(selectedPositionIds)}
              disabled={selectedPositionIds.length === 0 || addPositionsMutation.isPending}
            >
              {addPositionsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {selectedPositionIds.length} Position{selectedPositionIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
