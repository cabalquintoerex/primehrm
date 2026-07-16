import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, Globe, XCircle, FileDown, FileSpreadsheet, RotateCcw, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { generateCSCBatchForm } from '@/lib/generateCSCBatchForm';
import { generateCSCBatchExcel } from '@/lib/generateCSCBatchExcel';
import { useAuthStore } from '@/stores/authStore';
import type { Publication, PositionCatalog, Position, PositionStatus, Department } from '@/types';

interface DocRequirement {
  label: string;
  description: string;
  isRequired: boolean;
}

// LGU Salary Schedule - Step 1 (Second Tranche) — mirrors the catalog form for SG salary auto-fill.
const SALARY_GRADE_TABLE: Record<number, number> = {
  1: 14061, 2: 14925, 3: 15852, 4: 16833, 5: 17866,
  6: 18957, 7: 20110, 8: 21448, 9: 23226, 10: 25586,
  11: 30024, 12: 32245, 13: 34421, 14: 37024, 15: 40208,
  16: 43560, 17: 47247, 18: 51304, 19: 56390, 20: 62967,
  21: 70013, 22: 78162, 23: 87315, 24: 98185, 25: 111727,
  26: 126252, 27: 142663, 28: 160469, 29: 180492, 30: 203200,
};

const QS_FIELDS = ['education', 'training', 'experience', 'eligibility', 'competency', 'description'] as const;

/** True when the instance's qualification standards differ from its catalog master. */
function isCustomized(position: Position): boolean {
  if (!position.catalog) return false;
  return QS_FIELDS.some((f) => (position[f] || '') !== ((position.catalog as any)[f] || ''));
}

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

  // Per-publication position editing
  const [editing, setEditing] = useState<Position | null>(null);
  const emptyForm = {
    title: '', itemNumber: '', salaryGrade: '' as number | '', monthlySalary: '' as number | '',
    placeOfAssignment: '', departmentId: 'none', slots: 1,
    education: '', training: '', experience: '', eligibility: '', competency: '', description: '',
  };
  const [editForm, setEditForm] = useState(emptyForm);
  const [editDocReqs, setEditDocReqs] = useState<DocRequirement[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);

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

  // Departments for the edit dialog's Office/Department select.
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: { limit: 100 } });
      return data.data;
    },
    enabled: !!editing,
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await api.put(`/positions/${editing.id}`, {
        title: editForm.title,
        itemNumber: editForm.itemNumber || null,
        salaryGrade: editForm.salaryGrade === '' ? null : editForm.salaryGrade,
        monthlySalary: editForm.monthlySalary === '' ? null : editForm.monthlySalary,
        placeOfAssignment: editForm.placeOfAssignment || null,
        departmentId: editForm.departmentId !== 'none' ? Number(editForm.departmentId) : null,
        slots: editForm.slots,
        education: editForm.education || null,
        training: editForm.training || null,
        experience: editForm.experience || null,
        eligibility: editForm.eligibility || null,
        competency: editForm.competency || null,
        description: editForm.description || null,
      });
      await api.post(`/positions/${editing.id}/requirements`, {
        requirements: editDocReqs.map((r, i) => ({
          label: r.label,
          description: r.description || null,
          isRequired: r.isRequired,
          sortOrder: i + 1,
        })),
      });
    },
    onSuccess: () => { invalidate(); toast.success('Position updated for this publication'); setEditing(null); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update position'),
  });

  const openEdit = async (position: Position) => {
    setEditing(position);
    setLoadingEdit(true);
    setEditForm({
      title: position.title,
      itemNumber: position.itemNumber || '',
      salaryGrade: position.salaryGrade ?? '',
      monthlySalary: position.monthlySalary != null ? Number(position.monthlySalary) : '',
      placeOfAssignment: position.placeOfAssignment || '',
      departmentId: position.departmentId ? String(position.departmentId) : 'none',
      slots: position.slots,
      education: position.education || '',
      training: position.training || '',
      experience: position.experience || '',
      eligibility: position.eligibility || '',
      competency: position.competency || '',
      description: position.description || '',
    });
    try {
      const { data } = await api.get(`/positions/${position.id}/requirements`);
      const reqs = (data.data || []) as { label: string; description: string | null; isRequired: boolean }[];
      setEditDocReqs(reqs.map((r) => ({ label: r.label, description: r.description || '', isRequired: r.isRequired })));
    } catch {
      setEditDocReqs([]);
    } finally {
      setLoadingEdit(false);
    }
  };

  // Re-copy the catalog master's qualifications + document requirements into the edit form.
  const resetToCatalogDefault = async () => {
    if (!editing?.catalogId) return;
    setLoadingEdit(true);
    try {
      const { data } = await api.get(`/position-catalog/${editing.catalogId}`);
      const cat = data.data;
      setEditForm((prev) => ({
        ...prev,
        education: cat.education || '',
        training: cat.training || '',
        experience: cat.experience || '',
        eligibility: cat.eligibility || '',
        competency: cat.competency || '',
        description: cat.description || '',
      }));
      const reqs = (cat.documentRequirements || []) as { label: string; description: string | null; isRequired: boolean }[];
      setEditDocReqs(reqs.map((r) => ({ label: r.label, description: r.description || '', isRequired: r.isRequired })));
      toast.success('Reset to catalog default — review, then Save to apply');
    } catch {
      toast.error('Could not load the catalog default');
    } finally {
      setLoadingEdit(false);
    }
  };

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
          {user?.lgu?.slug && (
            <Button asChild variant="outline">
              <a href={`/${user.lgu.slug}/careers`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Careers Page
              </a>
            </Button>
          )}
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
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {position.title}
                      {isCustomized(position) && (
                        <Badge variant="outline" className="text-[10px] font-normal" title="Qualifications differ from the catalog master">
                          Customized
                        </Badge>
                      )}
                    </div>
                  </TableCell>
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
                        {position.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(position)}
                            title="Edit qualifications & requirements for this publication"
                          >
                            <Pencil className="h-4 w-4" />
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

      {/* Edit Position (per-publication) Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Position for this Publication</DialogTitle>
            <DialogDescription>
              Adjust the qualifications, slots, and document requirements for this posting only. The
              catalog master and other publications are not affected.
            </DialogDescription>
          </DialogHeader>
          {loadingEdit ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto space-y-4 py-2 px-1">
              {editing?.catalogId && (
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    Snapshotted from the catalog. Edits here stay in this publication.
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={resetToCatalogDefault}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Reset to catalog default
                  </Button>
                </div>
              )}

              <div className="pb-2 border-b">
                <h3 className="text-sm font-semibold text-gray-700">Position Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-title">Position Title</Label>
                  <Input id="e-title" value={editForm.title}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-item">Plantilla Item No.</Label>
                  <Input id="e-item" value={editForm.itemNumber}
                    onChange={(e) => setEditForm((p) => ({ ...p, itemNumber: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-sg">Salary Grade</Label>
                  <Input id="e-sg" type="number" value={editForm.salaryGrade}
                    onChange={(e) => {
                      const grade = parseInt(e.target.value);
                      setEditForm((p) => ({
                        ...p,
                        salaryGrade: e.target.value === '' ? '' : grade,
                        monthlySalary: grade && SALARY_GRADE_TABLE[grade] ? SALARY_GRADE_TABLE[grade] : p.monthlySalary,
                      }));
                    }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-salary">Monthly Salary (₱)</Label>
                  <Input id="e-salary"
                    value={editForm.monthlySalary !== '' ? Number(editForm.monthlySalary).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, '');
                      setEditForm((p) => ({ ...p, monthlySalary: raw === '' ? '' : Number(raw) }));
                    }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-slots">No. of Vacancy/ies</Label>
                  <Input id="e-slots" type="number" min={1} value={editForm.slots}
                    onChange={(e) => setEditForm((p) => ({ ...p, slots: Math.max(1, Number(e.target.value) || 1) }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-place">Place of Assignment</Label>
                  <Input id="e-place" value={editForm.placeOfAssignment}
                    onChange={(e) => setEditForm((p) => ({ ...p, placeOfAssignment: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Office / Department</Label>
                  <Select value={editForm.departmentId} onValueChange={(v) => setEditForm((p) => ({ ...p, departmentId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pb-2 border-b mt-2">
                <h3 className="text-sm font-semibold text-gray-700">Qualification Standards</h3>
              </div>

              {([
                ['education', 'Education'],
                ['training', 'Training'],
                ['experience', 'Work Experience'],
                ['eligibility', 'Eligibility'],
                ['competency', 'Competency (if applicable)'],
                ['description', 'Brief Description of the General Function'],
              ] as const).map(([field, label]) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={`e-${field}`}>{label}</Label>
                  <Textarea id={`e-${field}`} rows={field === 'description' ? 3 : 2}
                    value={editForm[field]}
                    onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))} />
                </div>
              ))}

              <div className="pb-2 border-b mt-2">
                <h3 className="text-sm font-semibold text-gray-700">Document Requirements</h3>
              </div>

              <div className="space-y-3">
                {editDocReqs.map((req, index) => (
                  <div key={index} className="rounded-md border p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={req.label}
                          placeholder="Requirement label"
                          className="text-sm"
                          onChange={(e) => setEditDocReqs((reqs) => reqs.map((r, i) => i === index ? { ...r, label: e.target.value } : r))}
                        />
                        <Input
                          value={req.description}
                          placeholder="Description (optional)"
                          className="text-xs text-muted-foreground"
                          onChange={(e) => setEditDocReqs((reqs) => reqs.map((r, i) => i === index ? { ...r, description: e.target.value } : r))}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={req.isRequired}
                            onCheckedChange={(checked) => setEditDocReqs((reqs) => reqs.map((r, i) => i === index ? { ...r, isRequired: checked } : r))}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {req.isRequired ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setEditDocReqs((reqs) => reqs.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setEditDocReqs((reqs) => [...reqs, { label: '', description: '', isRequired: false }])}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Requirement
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || loadingEdit}>
              {editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
