import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { environment } from 'src/environments/environment';
import { StaffService } from 'src/app/services/staff.service';
import { Role } from 'src/app/enums/role.enum';
import { ManagerItem } from 'src/app/interfaces/staff.interface';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/services/toast.service';
import { IdbService } from 'src/app/services/idb.service';
import Swal from 'sweetalert2';

@Component({
  templateUrl: './managers-list.html',
  animations: [toggleAnimation],
})
export class ManagersListComponent implements OnInit {
  loading = false;
  error: string | null = null;
  managers: ManagerItem[] = [];
  // Sidebar modal state
  showSidebar = false;
  selectedManager: ManagerItem | null = null;
  // Add Member Sidebar state
  showAddSidebar = false;
  addForm!: FormGroup;
  submitting = false;
  roles = [Role.Manager, Role.Waiter];
  // Edit Member Sidebar state
  showUpdateSidebar = false;
  editForm!: FormGroup;
  updating = false;
  // File handling for Add Member
  selectedImageBase64: string = '';
  selectedAgreementBase64: string = '';
  selectedCnicBase64: string = '';
  agreementFileType: string = '';
  imageFileType: string = '';
  cnicFileType: string = '';
  agreementPreview: string | null = null;
  imagePreview: string | null = null;
  cnicPreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private staffService: StaffService,
    private router: Router,
    private toast: ToastService,
    private idb: IdbService,
  ) {
    // Ensure form exists ASAP so template bindings never see undefined
    this.buildAddForm();
  }

  private isWaiter(val: any): boolean {
    try {
      if (val === Role.Waiter) return true;
      const s = String(val || '').toLowerCase();
      return s.includes('waiter');
    } catch {
      return false;
    }
  }

  // Determine if a role value represents Admin (supports enum or string)
  isAdminRole(val: any): boolean {
    try {
      if (val === Role.Admin) return true;
      const s = String(val || '').toLowerCase();
      return s === 'admin' || s.includes('admin');
    } catch {
      return false;
    }
  }

  // Map role enum or string to readable label for template
  roleLabel(val: any): string {
    try {
      if (val === null || val === undefined) return '—';
      // If enum value
      if (val === Role.Manager) return 'Manager';
      if (val === Role.Waiter) return 'Waiter';
      // If string
      const s = String(val).toLowerCase();
      if (s.includes('manager')) return 'Manager';
      if (s.includes('waiter')) return 'Waiter';
      // Fallback capitalize
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
    } catch {
      return '—';
    }
  }

  private getExtension(path: string): string | null {
    try {
      const lower = String(path).toLowerCase();
      const idx = lower.lastIndexOf('.');
      if (idx === -1) return null;
      return lower.substring(idx + 1);
    } catch {
      return null;
    }
  }

  private fullUrl(path?: string | null): string | null {
    const base = (environment as any)?.imgUrl || (environment as any)?.baseUrl || '';
    if (!path) return null;
    // Avoid double prefix if already starts with http
    if (/^https?:\/\//i.test(path)) return path;
    const baseNorm = base.endsWith('/') ? base.slice(0, -1) : base;
    const pathNorm = path.startsWith('/') ? path.slice(1) : path;
    return `${baseNorm}/${pathNorm}`;
  }

  // ---- File handlers for Edit Member (reuse previews/state) ----
  onEditImageSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.imageFileType = file.type || '';
    const r = new FileReader();
    r.onload = (e: any) => (this.imagePreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedImageBase64 = base64;
      this.editForm.patchValue({ image: base64 });
    });
  }

  onEditAgreementSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.agreementFileType = file.type || '';
    const r = new FileReader();
    r.onload = (e: any) => (this.agreementPreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedAgreementBase64 = base64;
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const extension = ext === 'pdf' || this.agreementFileType.includes('pdf') ? 'pdf' : 'image';
      const agreementObject = { extension, image: base64 } as any;
      this.editForm.patchValue({ agreement: agreementObject });
    });
  }

  onEditCnicSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.cnicFileType = file.type || '';
    const r = new FileReader();
    r.onload = (e: any) => (this.cnicPreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedCnicBase64 = base64;
      this.editForm.patchValue({ cnic: base64 });
    });
  }

  private clearEditUploads(): void {
    this.imagePreview = null;
    this.agreementPreview = null;
    this.cnicPreview = null;
    this.selectedImageBase64 = '';
    this.selectedAgreementBase64 = '';
    this.selectedCnicBase64 = '';
    this.imageFileType = '';
    this.agreementFileType = '';
    this.cnicFileType = '';
    this.editForm?.patchValue({ image: null, agreement: null, cnic: '' });
  }

  removeEditImage(): void {
    this.imagePreview = null;
    this.selectedImageBase64 = '';
    this.imageFileType = '';
    this.editForm?.patchValue({ image: null });
  }

  removeEditAgreement(): void {
    this.agreementPreview = null;
    this.selectedAgreementBase64 = '';
    this.agreementFileType = '';
    this.editForm?.patchValue({ agreement: null });
  }

  removeEditCnic(): void {
    this.cnicPreview = null;
    this.selectedCnicBase64 = '';
    this.cnicFileType = '';
    this.editForm?.patchValue({ cnic: '' });
  }

  // ---- Edit Member Sidebar ----
  private buildEditForm(m: ManagerItem): void {
    this.editForm = this.fb.group({
      id: [m?.id, [Validators.required]],
      name: [m?.name || '', [Validators.required, Validators.minLength(2)]],
      email: [m?.email || '', [Validators.required, Validators.email]],
      phone: [m?.phone || '', [Validators.required]],
      role: [Role.Manager, [Validators.required]],
      password: [m?.password || ''], // optional; if empty keep existing
      image: [null],
      cnic: [null],
      agreement: [null],
    });
  }

  openUpdateSidebar(m: ManagerItem): void {
    this.selectedManager = m;
    this.buildEditForm(m);
    this.showUpdateSidebar = true;
    // Initialize previews from existing values
    const imgPath: string | null = (m as any)?.image ?? null;
    const cnicPath: string | null = (m as any)?.cnic ?? null;
    const agrPath: string | null = (m as any)?.agrement ?? null;
    const imageUrl = this.fullUrl(imgPath);
    const cnicUrl = this.fullUrl(cnicPath);
    const agrementUrl = this.fullUrl(agrPath || undefined);
    this.imagePreview = imageUrl;
    this.cnicPreview = cnicUrl;
    // Seed form controls so submit has values even without new uploads
    this.editForm.patchValue({ image: imageUrl || null, cnic: cnicUrl || null, agreement: agrementUrl || null });
    if (agrPath) {
      const ext = this.getExtension(agrPath);
      if (ext === 'pdf') {
        this.agreementFileType = 'application/pdf';
        // Any non-null value to show the PDF Selected badge
        this.agreementPreview = agrementUrl || 'pdf';
      } else {
        this.agreementFileType = 'image/*';
        this.agreementPreview = agrementUrl;
      }
    } else {
      this.agreementPreview = null;
      this.agreementFileType = '';
    }
  }

  closeUpdateSidebar(): void {
    this.showUpdateSidebar = false;
    this.selectedManager = null;
  }

  onSubmitUpdate(): void {
    if (!this.editForm || this.editForm.invalid) {
      this.editForm?.markAllAsTouched();
      return;
    }
    const { id, name, email, phone, role, password } = this.editForm.value;
    // Existing server paths for fallback
    const imageExistingPath: string | null = (this.selectedManager as any)?.image ?? null;
    const cnicExistingPath: string | null = (this.selectedManager as any)?.cnic ?? null;
    const agrementExistingPath: string | null = (this.selectedManager as any)?.agrement ?? null;

    // Compute agreement: prefer new base64, else existing full URL
    let agrement: string | null = this.selectedAgreementBase64
      || (typeof (this.editForm.value as any)?.agreement === 'object' ? (this.editForm.value as any).agreement?.image : (this.editForm.value as any)?.agreement)
      || null;
    if (!agrement) {
      agrement = this.fullUrl(agrementExistingPath);
    }
    let extention: 'pdf' | 'image' | null = null;
    if (this.selectedAgreementBase64) {
      extention = this.agreementFileType?.toLowerCase().includes('pdf') ? 'pdf' : 'image';
    } else if (agrementExistingPath) {
      const ex = this.getExtension(agrementExistingPath);
      extention = ex === 'pdf' ? 'pdf' : (ex ? 'image' : null);
    }

    // Prefer newly selected base64; otherwise prefix existing server paths with env imgUrl
    const image: string | null = this.selectedImageBase64 || this.fullUrl((this.editForm.value as any)?.image || imageExistingPath);
    const cnic: string | null = this.selectedCnicBase64 || this.fullUrl((this.editForm.value as any)?.cnic || cnicExistingPath);

    const roleStr = role === Role.Manager ? 'manager' : 'waiter';
    const payload: any = {
      id,
      name,
      email,
      phone,
      role: roleStr,
      image,
      cnic,
      agrement,
      extention,
    };
    if (password) payload.password = password;

    this.updating = true;
    this.staffService.updateManager(payload).subscribe({
      next: (resp: any) => {
        this.updating = false;
        if (resp?.error === true) {
          this.toast.error(resp?.message || 'Failed to update member');
          return;
        }
        this.toast.success('Member updated successfully');
        this.closeUpdateSidebar();
        this.fetchManagers();
        this.clearEditUploads();
      },
      error: (err) => {
        this.updating = false;
        const msg = err?.error?.message || 'Failed to update member';
        this.toast.error(msg);
      },
    });
  }

  // helpers for Add Member previews
  isPdf(ft: string): boolean {
    return (ft || '').toLowerCase().includes('pdf');
  }

  removeAddImage(): void {
    this.imagePreview = null;
    this.selectedImageBase64 = '';
    this.imageFileType = '';
    this.addForm.patchValue({ image: null });
  }

  removeAddAgreement(): void {
    this.agreementPreview = null;
    this.selectedAgreementBase64 = '';
    this.agreementFileType = '';
    this.addForm.patchValue({ agreement: null });
  }

  removeAddCnic(): void {
    this.cnicPreview = null;
    this.selectedCnicBase64 = '';
    this.cnicFileType = '';
    this.addForm.patchValue({ cnic: '' });
  }

  async ngOnInit(): Promise<void> {
    await this.loadFromCache();
    this.fetchManagers();
  }

  // View sidebar
  onView(m: ManagerItem): void {
    this.selectedManager = m;
    this.showSidebar = true;
  }

  closeSidebar(): void {
    this.showSidebar = false;
    this.selectedManager = null;
  }

  // Add Member sidebar controls
  openAddSidebar(): void {
    // Toggle to true explicitly to open
    this.showAddSidebar = true;
    // Debug: verify click handler triggers
    // eslint-disable-next-line no-console
    console.log('[ManagersList] openAddSidebar ->', this.showAddSidebar);
  }

  closeAddSidebar(): void {
    this.showAddSidebar = false;
    this.addForm.reset({
      email: '',
      password: '',
      role: Role.Manager,
      name: '',
      phone: '',
      cnic: '',
      managerId: null,
    });
  }

  private buildAddForm(): void {
    this.addForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: [Role.Manager, [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      cnic: [''],
      image: [null],
      agreement: [null],
      managerId: [null],
    });
  }

  onSubmitAdd(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const { managerId, role, email, password, name, phone } = this.addForm.value;
    // Derive flat agreement fields per user request
    const agrement: string | null = this.selectedAgreementBase64
      || (typeof this.addForm.value?.agreement === 'object' ? this.addForm.value.agreement?.image : this.addForm.value?.agreement)
      || null;
    const extention: 'pdf' | 'image' | null = this.agreementFileType?.toLowerCase().includes('pdf') ? 'pdf' : (agrement ? 'image' : null);

    const image: string | null = this.selectedImageBase64 || this.addForm.value?.image || null;
    const cnic: string | null = this.selectedCnicBase64 || this.addForm.value?.cnic || null;

    const roleStr = role === Role.Manager ? 'manager' : 'waiter';
    const basePayload: any = { name, password, phone, role: roleStr, email, image, cnic, agrement, extention };
    this.submitting = true;
   
      this.staffService.addManage(basePayload).subscribe({
        next: () => {
          this.submitting = false;
          this.removeAddCnic();
          this.removeAddImage();
          this.removeAddAgreement();
          this.toast.success('Staff added successfully');
          this.closeAddSidebar();
          this.fetchManagers();
        },
        error: (err) => {
          this.submitting = false;
          const msg = err?.error?.message || 'Failed to add manager';
          this.toast.error(msg);
        },
      });
   
  }

  // ---- File handlers for Add Member ----
  onAddImageSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.imageFileType = file.type || '';
    // preview
    const r = new FileReader();
    r.onload = (e: any) => (this.imagePreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedImageBase64 = base64;
      this.addForm.patchValue({ image: base64 });
    });
  }

  onAddAgreementSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.agreementFileType = file.type || '';
    // preview
    const r = new FileReader();
    r.onload = (e: any) => (this.agreementPreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedAgreementBase64 = base64;
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const extension = ext === 'pdf' || this.agreementFileType.includes('pdf') ? 'pdf' : 'image';
      const agreementObject = { extension, image: base64 };
      this.addForm.patchValue({ agreement: agreementObject });
    });
  }

  onAddCnicSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.cnicFileType = file.type || '';
    const r = new FileReader();
    r.onload = (e: any) => (this.cnicPreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedCnicBase64 = base64;
      this.addForm.patchValue({ cnic: base64 });
    });
  }

  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] ?? result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  fetchManagers(): void {
    // Background refresh if cache already filled
    if (!this.managers.length) this.loading = true;
    this.error = null;
    this.staffService.getManagers().subscribe({
      next: async (list: ManagerItem[]) => {
        const onlyManagers = (list || []).filter((m: any) => !this.isWaiter(m?.role));
        this.managers = onlyManagers;
        this.loading = false;
        try {
          await this.idb.clearStore('managers');
          await this.idb.putAll('managers', onlyManagers as any[]);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Failed to update managers cache', e);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load managers';
      },
    });
  }

  private async loadFromCache(): Promise<void> {
    try {
      const cached = await this.idb.getAll<ManagerItem>('managers');
      if (Array.isArray(cached) && cached.length) {
        this.managers = cached;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read managers cache', e);
    }
  }

  onEdit(m: ManagerItem): void {
    this.openUpdateSidebar(m);
  }

  onDelete(m: ManagerItem): void {
    if (!m?.id) {
      this.toast.error('Invalid manager id');
      return;
    }
    Swal.fire({
      title: 'Delete manager?',
      text: `Are you sure you want to delete ${m.name || 'this manager'}? This action cannot be undone.`,
      icon: undefined,
      iconHtml:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
      background: '#ffffff',
      color: '#111827',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      customClass: {
        popup: 'rounded-lg shadow-xl',
        icon: '!text-red-600',
        confirmButton: 'swal2-confirm !bg-red-600 !text-white !uppercase !font-extrabold !px-4 !py-2.5 !rounded-md hover:!bg-red-700',
        cancelButton: 'swal2-cancel !bg-white !text-gray-700 !font-semibold !px-4 !py-2.5 !rounded-md !border !border-gray-300 hover:!bg-gray-100',
        title: 'font-extrabold text-red-600',
      },
    }).then((res) => {
      if (res.isConfirmed) {
        this.loading = true;
        this.staffService.deleteManager(String(m.id)).subscribe({
          next: () => {
            this.toast.success('Manager deleted successfully');
            // Update UI and cache immediately
            this.fetchManagers();
            this.managers = this.managers.filter((x) => x.id !== m.id);
            this.idb.clearStore('managers').then(() => this.idb.putAll('managers', this.managers as any[]));
          },
          error: (err) => {
            this.loading = false;
            const msg = err?.error?.message || 'Failed to delete manager';
            this.toast.error(msg);
          },
        });
      }
    });
  }
}
