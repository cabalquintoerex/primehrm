import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { Publication, PositionCatalog, PositionStatus } from '@/types';

function StatusBadge({ status }: { status: PositionStatus }) {
  switch (status) {
    case 'DRAFT': return <Badge variant="secondary">Draft</Badge>;
    case 'OPEN': return <Badge className="bg-green-600 hover:bg-green-700">Open</Badge>;
    case 'CLOSED': return <Badge variant="outline">Closed</Badge>;
    case 'FILLED': return <Badge className="bg-blue-600 hover:bg-blue-700">Filled</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

export function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  // catalogId -> slots for the positions selected to add
  const [selected, setSelected] = useState<Record<number, number>>({});

  const { data: publication, isLoading } = useQuery<Publication>({
    queryKey: ['publication', id],
    queryFn: async () => {
      const { data } = await api.get(`/publications/${id}`);
      return data.data;
    },
  });

  // Active catalog positions to snapshot into this publication.
  const { data: catalog, isLoading: loadingCatalog } = useQuery<PositionCatalog[]>({
    queryKey: ['position-catalog', 'active-list'],
    queryFn: async () => {
      const { data } = await api.get('/position-catalog', { params: { active: 'true', limit: 100 } });
      return data.data;
    },
    enabled: addDialogOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['publication', id] });
    queryClient.invalidateQueries({ queryKey: ['publications'] });
    queryClient.invalidateQueries({ queryKey: ['position-catalog'] });
  };

  const publishMutation = useMutation({
    mutationFn: async () => api.put(`/publications/${id}/publish`),
    onSuccess: () => { invalidate(); toast.success('Publication published successfully'); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to publish'),
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => api.put(`/publications/${id}/unpublish`),
    onSuccess: () => { invalidate(); toast.success('Publication unpublished'); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to unpublish'),
  });

  const addPositionsMutation = useMutation({
    mutationFn: async (positions: { catalogId: number; slots: number }[]) => {
      await api.post(`/publications/${id}/positions`, { positions });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Positions added to publication');
      setAddDialogOpen(false);
      setSelected({});
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to add positions'),
  });

  const removePositionMutation = useMutation({
    mutationFn: async (positionId: number) => api.delete(`/publications/${id}/positions/${positionId}`),
    onSuccess: () => { invalidate(); toast.success('Position removed from publication'); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to remove position'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ positionId, status }: { positionId: number; status: PositionStatus }) =>
      api.put(`/positions/${positionId}/status`, { status }),
    onSuccess: () => { invalidate(); toast.success('Position status updated'); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update status'),
  });

  const toggleCatalog = (catalogId: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (catalogId in next) delete next[catalogId];
      else next[catalogId] = 1;
      return next;
    });
  };

  const selectedList = Object.entries(selected).map(([catalogId, slots]) => ({ catalogId: Number(catalogId), slots }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!publication) {
    return <div className="text-center py-12 text-muted-foreground">Publication not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/rsp/publications')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Publication {publication.publicationNumber}</h1>
            {publication.isPublished ? (
              <Badge className="bg-green-600 hover:bg-green-700">Published</Badge>
            ) : (
              <Badge variant="secondary">Unpublished</Badge>
            )}
          </div>
          {publication.description && (
            <p className="text-sm text-muted-foreground mt-1">{publication.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => generateCSCBatchForm(publication)}
            disabled={!publication.positions || publication.positions.length === 0}
            title={!publication.positions || publication.positions.length === 0 ? 'Add positions first' : 'Export CS Form No. 9'}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => generateCSCBatchExcel(publication)}
            disabled={!publication.positions || publication.positions.length === 0}
            title={!publication.positions || publication.positions.length === 0 ? 'Add positions first' : 'Export CS Form No. 9 as Excel'}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          {!isSuperAdmin && (publication.isPublished ? (
            <Button variant="outline" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>
              {unpublishMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Unpublish
            </Button>
          ) : (
            <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
              Mark as Published
            </Button>
          ))}
        </div>
      </div>

      {/* Publication Info */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{publication.positions?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Posting Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{new Date(publication.openDate).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closing Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{new Date(publication.closeDate).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Created By</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {publication.creator ? `${publication.creator.firstName} ${publication.creator.lastName}` : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {publication.isPublished ? 'Published At' : 'Created At'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {publication.isPublished && publication.publishedAt
                ? new Date(publication.publishedAt).toLocaleDateString()
                : new Date(publication.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Positions in this Publication</h2>
        {!isSuperAdmin && (
          <Button variant="outline" onClick={() => { setSelected({}); setAddDialogOpen(true); }}>
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
              <TableHead>Slots</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[260px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!publication.positions || publication.positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No positions in this publication
                </TableCell>
              </TableRow>
            ) : (
              publication.positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">{position.title}</TableCell>
                  <TableCell className="text-muted-foreground">{position.itemNumber || '-'}</TableCell>
                  <TableCell>{position.salaryGrade ?? '-'}</TableCell>
                  <TableCell>{position.department?.name || '-'}</TableCell>
                  <TableCell>{position.slots}</TableCell>
                  <TableCell><StatusBadge status={position.status} /></TableCell>
                  {!isSuperAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {position.status === 'DRAFT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => statusMutation.mutate({ positionId: position.id, status: 'OPEN' })}
                            disabled={statusMutation.isPending || !publication.isPublished}
                            title={!publication.isPublished ? 'Publish the publication first' : ''}
                          >
                            Publish
                          </Button>
                        )}
                        {position.status === 'OPEN' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => statusMutation.mutate({ positionId: position.id, status: 'DRAFT' })}
                              disabled={statusMutation.isPending}
                            >
                              Unpublish
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => statusMutation.mutate({ positionId: position.id, status: 'CLOSED' })}
                              disabled={statusMutation.isPending}
                            >
                              Close
                            </Button>
                          </>
                        )}
                        {position.status === 'CLOSED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => statusMutation.mutate({ positionId: position.id, status: 'FILLED' })}
                            disabled={statusMutation.isPending}
                          >
                            Mark Filled
                          </Button>
                        )}
                        {position.status === 'DRAFT' && (position._count?.applications ?? 0) === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePositionMutation.mutate(position.id)}
                            disabled={removePositionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
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
            <DialogTitle>Add Positions to Publication</DialogTitle>
            <DialogDescription>
              Select positions from the catalog. Each becomes a posting in this publication with its own vacancy count.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {loadingCatalog ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !catalog || catalog.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No catalog positions available. Create positions in the Positions module first.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Item No.</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="w-[100px]">Slots</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalog.map((position) => {
                    const isSelected = position.id in selected;
                    return (
                      <TableRow key={position.id} className="cursor-pointer" onClick={() => toggleCatalog(position.id)}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCatalog(position.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{position.title}</TableCell>
                        <TableCell className="text-muted-foreground">{position.itemNumber || '-'}</TableCell>
                        <TableCell>{position.department?.name || '-'}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min={1}
                            value={isSelected ? selected[position.id] : 1}
                            disabled={!isSelected}
                            onChange={(e) =>
                              setSelected((prev) => ({ ...prev, [position.id]: Math.max(1, Number(e.target.value) || 1) }))
                            }
                            className="h-8 w-16"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addPositionsMutation.mutate(selectedList)}
              disabled={selectedList.length === 0 || addPositionsMutation.isPending}
            >
              {addPositionsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {selectedList.length} Position{selectedList.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
