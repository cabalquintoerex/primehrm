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
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Search, Loader2, X } from 'lucide-react';
import { SuggestionInput, SuggestionTextarea } from '@/components/ui/suggestion-input';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { PositionCatalog, Department, PaginatedResponse } from '@/types';

interface DocRequirement {
  label: string;
  description: string;
  isRequired: boolean;
}

const DEFAULT_REQUIREMENTS: DocRequirement[] = [
  { label: 'Letter of Intent', description: 'Addressed to the appropriate director/head. Indicate the Position Title and Plantilla Item Number.', isRequired: true },
  { label: 'Personal Data Sheet with Work Experience Sheet', description: 'Fully accomplished PDS with WES and recent passport-sized photo (CS Form No. 212, Revised 2025). Single PDF file.', isRequired: true },
  { label: 'Performance Rating', description: 'Performance rating in the last rating period (if applicable).', isRequired: false },
  { label: 'Certificate of Eligibility/Rating/License', description: 'Copy of Certificate of Eligibility, Rating, or License.', isRequired: true },
  { label: 'Transcript of Records', description: 'Copy of Transcript of Records.', isRequired: true },
  { label: 'Training Certificates', description: 'For positions with training requirements. All certificates in a single PDF file.', isRequired: false },
  { label: 'Designation Orders', description: 'If applicable.', isRequired: false },
];

const catalogSchema = z.object({
  title: z.string().min(1, 'Position Title is required'),
  itemNumber: z.string().optional(),
  salaryGrade: z.coerce.number().int().positive().optional().or(z.literal('')),
  monthlySalary: z.coerce.number().positive().optional().or(z.literal('')),
  placeOfAssignment: z.string().optional(),
  departmentId: z.string().optional(),
  education: z.string().optional(),
  training: z.string().optional(),
  experience: z.string().optional(),
  eligibility: z.string().optional(),
  competency: z.string().optional(),
  description: z.string().optional(),
});

type CatalogFormData = z.infer<typeof catalogSchema>;

// LGU Salary Schedule - Step 1 (Second Tranche, Special Cities & 1st Class Provinces/Cities)
const SALARY_GRADE_TABLE: Record<number, number> = {
  1: 14061, 2: 14925, 3: 15852, 4: 16833, 5: 17866,
  6: 18957, 7: 20110, 8: 21448, 9: 23226, 10: 25586,
  11: 30024, 12: 32245, 13: 34421, 14: 37024, 15: 40208,
  16: 43560, 17: 47247, 18: 51304, 19: 56390, 20: 62967,
  21: 70013, 22: 78162, 23: 87315, 24: 98185, 25: 111727,
  26: 126252, 27: 142663, 28: 160469, 29: 180492, 30: 203200,
};

export function PositionPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PositionCatalog | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<PositionCatalog | null>(null);
  const [docRequirements, setDocRequirements] = useState<DocRequirement[]>([]);
  const [isActive, setIsActive] = useState(true);

  const { data, isLoading } = useQuery<PaginatedResponse<PositionCatalog>>({
    queryKey: ['position-catalog', debouncedSearch, page],
    queryFn: async () => {
      const params: Record<string, any> = { search: debouncedSearch, page, limit: 20 };
      const { data } = await api.get('/position-catalog', { params });
      return data;
    },
    staleTime: 0,
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: { limit: 100 } });
      return data.data;
    },
  });

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema),
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: CatalogFormData) => {
      const payload = {
        ...formData,
        salaryGrade: formData.salaryGrade === '' ? null : formData.salaryGrade || null,
        monthlySalary: formData.monthlySalary === '' ? null : formData.monthlySalary || null,
        departmentId: formData.departmentId && formData.departmentId !== 'none' ? Number(formData.departmentId) : null,
        itemNumber: formData.itemNumber || null,
        placeOfAssignment: formData.placeOfAssignment || null,
        education: formData.education || null,
        training: formData.training || null,
        experience: formData.experience || null,
        eligibility: formData.eligibility || null,
        competency: formData.competency || null,
        description: formData.description || null,
        isActive,
        documentRequirements: docRequirements.map((r, i) => ({
          label: r.label,
          description: r.description || null,
          isRequired: r.isRequired,
          sortOrder: i + 1,
        })),
      };
      if (editing) {
        await api.put(`/position-catalog/${editing.id}`, payload);
      } else {
        await api.post('/position-catalog', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position-catalog'] });
      toast.success(editing ? 'Position updated' : 'Position created');
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save position');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/position-catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position-catalog'] });
      toast.success('Position deleted');
      setDeleteDialogOpen(false);
      setDeleting(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete position');
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      title: '', itemNumber: '', salaryGrade: '', monthlySalary: '',
      placeOfAssignment: '', departmentId: '', education: '',
      training: '', experience: '', eligibility: '', competency: '', description: '',
    });
    setDocRequirements([...DEFAULT_REQUIREMENTS]);
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = async (position: PositionCatalog) => {
    setEditing(position);
    reset({
      title: position.title,
      itemNumber: position.itemNumber || '',
      salaryGrade: position.salaryGrade ?? '',
      monthlySalary: position.monthlySalary != null ? Number(position.monthlySalary) : '',
      placeOfAssignment: position.placeOfAssignment || '',
      departmentId: position.departmentId ? String(position.departmentId) : '',
      education: position.education || '',
      training: position.training || '',
      experience: position.experience || '',
      eligibility: position.eligibility || '',
      competency: position.competency || '',
      description: position.description || '',
    });
    setIsActive(position.isActive);
    try {
      const { data } = await api.get(`/position-catalog/${position.id}`);
      const reqs = (data.data?.documentRequirements || []) as { label: string; description: string | null; isRequired: boolean }[];
      setDocRequirements(
        reqs.length > 0
          ? reqs.map((r) => ({ label: r.label, description: r.description || '', isRequired: r.isRequired }))
          : [...DEFAULT_REQUIREMENTS]
      );
    } catch {
      setDocRequirements([...DEFAULT_REQUIREMENTS]);
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Positions</h1>
          <p className="text-sm text-muted-foreground">
            Master catalog of position definitions. Add these to a publication to open them for applications.
          </p>
        </div>
        {!isSuperAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Position
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search positions..."
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
              <TableHead>Title</TableHead>
              <TableHead>Item No.</TableHead>
              <TableHead>Salary Grade</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Used in</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
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
                  No positions found
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">{position.title}</TableCell>
                  <TableCell className="text-muted-foreground">{position.itemNumber || '-'}</TableCell>
                  <TableCell>{position.salaryGrade ?? '-'}</TableCell>
                  <TableCell>{position.department?.name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {position._count?.positions ?? 0} publication{(position._count?.positions ?? 0) !== 1 ? 's' : ''}
                  </TableCell>
                  <TableCell>
                    {position.isActive
                      ? <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                      : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!isSuperAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(position)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {!isSuperAdmin && (position._count?.positions ?? 0) === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setDeleting(position); setDeleteDialogOpen(true); }}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Position' : 'Add New Position'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the reusable position definition' : 'Define a reusable position for the catalog'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
            <div className="max-h-[70vh] overflow-y-auto space-y-4 py-4 px-1">
              {/* Section: Basic Information */}
              <div className="pb-2 border-b">
                <h3 className="text-sm font-semibold text-gray-700">Position Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Position Title *</Label>
                  <Input id="title" autoComplete="off" placeholder="e.g. Administrative Officer III" {...register('title')} />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemNumber">Plantilla Item No.</Label>
                  <SuggestionInput id="itemNumber" {...register('itemNumber')} suggestion="LGCEB-AO3-2024" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryGrade">Salary / Job / Pay Grade</Label>
                  <Input
                    id="salaryGrade"
                    type="number"
                    {...register('salaryGrade', {
                      onChange: (e) => {
                        const grade = parseInt(e.target.value);
                        if (grade && SALARY_GRADE_TABLE[grade]) {
                          setValue('monthlySalary', SALARY_GRADE_TABLE[grade]);
                        }
                      },
                    })}
                    placeholder="15"
                  />
                  {errors.salaryGrade && <p className="text-sm text-destructive">{errors.salaryGrade.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlySalary">Monthly Salary (₱)</Label>
                  <Controller
                    name="monthlySalary"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="monthlySalary"
                        value={field.value !== '' && field.value != null
                          ? Number(field.value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          field.onChange(raw === '' ? '' : Number(raw));
                        }}
                        placeholder="e.g., 36,619.00"
                      />
                    )}
                  />
                  {errors.monthlySalary && <p className="text-sm text-destructive">{errors.monthlySalary.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="placeOfAssignment">Place of Assignment</Label>
                  <SuggestionInput id="placeOfAssignment" {...register('placeOfAssignment')} suggestion="City Engineer's Office" />
                </div>
                <div className="space-y-2">
                  <Label>Office / Department</Label>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || 'none'} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Department</SelectItem>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={String(dept.id)}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Section: Qualification Standards */}
              <div className="pb-2 border-b mt-2">
                <h3 className="text-sm font-semibold text-gray-700">Qualification Standards</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <SuggestionTextarea id="education" {...register('education')} suggestion="Bachelor's degree relevant to the job" rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="training">Training</Label>
                <SuggestionTextarea id="training" {...register('training')} suggestion="4 hours of relevant training" rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Work Experience</Label>
                <SuggestionTextarea id="experience" {...register('experience')} suggestion="1 year of relevant experience" rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eligibility">Eligibility</Label>
                <SuggestionTextarea id="eligibility" {...register('eligibility')} suggestion="Career Service Professional / Second Level Eligibility" rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competency">Competency (if applicable)</Label>
                <SuggestionTextarea id="competency" {...register('competency')} suggestion="Leadership, communication skills" rows={2} />
              </div>

              {/* Section: Instructions/Remarks */}
              <div className="pb-2 border-b mt-2">
                <h3 className="text-sm font-semibold text-gray-700">Instructions / Remarks</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Brief Description of the General Function of the Position</Label>
                <SuggestionTextarea id="description" {...register('description')} suggestion="Responsible for the development and interpretation of policies and standards on human resource systems..." rows={4} />
              </div>

              {/* Section: Document Requirements */}
              <div className="pb-2 border-b mt-2">
                <h3 className="text-sm font-semibold text-gray-700">Document Requirements</h3>
              </div>

              <div className="space-y-3">
                {docRequirements.map((req, index) => (
                  <div key={index} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={req.label}
                          onChange={(e) => {
                            const updated = [...docRequirements];
                            updated[index] = { ...updated[index], label: e.target.value };
                            setDocRequirements(updated);
                          }}
                          placeholder="Requirement label"
                          className="text-sm"
                        />
                        <Input
                          value={req.description}
                          onChange={(e) => {
                            const updated = [...docRequirements];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setDocRequirements(updated);
                          }}
                          placeholder="Description (optional)"
                          className="text-xs text-muted-foreground"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={req.isRequired}
                            onCheckedChange={(checked) => {
                              const updated = [...docRequirements];
                              updated[index] = { ...updated[index], isRequired: checked };
                              setDocRequirements(updated);
                            }}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {req.isRequired ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDocRequirements(docRequirements.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDocRequirements([...docRequirements, { label: '', description: '', isRequired: false }])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Requirement
                </Button>
              </div>

              {editing && (
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-sm text-muted-foreground">
                    {isActive ? 'Active — available to add to publications' : 'Inactive — hidden from new publications'}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Position</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleting?.title}"? This action cannot be undone.
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
