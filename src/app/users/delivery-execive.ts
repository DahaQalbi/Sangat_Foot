import { Component, OnInit } from '@angular/core';
import { StaffService } from 'src/app/services/staff.service';
import { ManagerItem } from 'src/app/interfaces/staff.interface';
import { toggleAnimation } from 'src/app/shared/animations';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from 'src/app/services/toast.service';
import Swal from 'sweetalert2';
import { Role } from 'src/app/enums/role.enum';
import { StaffSyncService } from 'src/app/services/staff-sync.service';
import { IdbService } from 'src/app/services/idb.service';
import { environment } from 'src/environments/environment';

@Component({
  templateUrl: './delivery-execive.html',
  animations: [toggleAnimation],
})
export class DeliveryExeciveComponent implements OnInit {
  loading = false;
  error: string | null = null;
  executives: ManagerItem[] = [];
  // search term for filtering
  search = '';
  // Update sidebar (edit waiter-like)
  showUpdateSidebar = false;
  updateForm!: FormGroup;
  updating = false;
  selectedItem: ManagerItem | null = null;
public imgUrl=environment.imgUrl;
  // Add Member Sidebar
  showAddSidebar = false;
  addForm!: FormGroup;
  submitting = false;

  // File handling (shared)
  selectedImageBase64: string = '';
  selectedAgreementBase64: string = '';
  selectedCnicBase64: string = '';
  agreementFileType: string = '';
  imageFileType: string = '';
  cnicFileType: string = '';
  agreementPreview: string | null = null;
  imagePreview: string | null = null;
  cnicPreview: string | null = null;
  // Edit previews
  agreementEditPreview: string | null = null;
  imageEditPreview: string | null = null;
  cnicEditPreview: string | null = null;

  constructor(private staffService: StaffService, private fb: FormBuilder, private toast: ToastService, private staffSync: StaffSyncService, private idb: IdbService) {}

  ngOnInit(): void {
    this.fetchExecutives();
    this.buildAddForm();
  }

  // filtered view for template
  get filteredExecutives(): ManagerItem[] {
    const term = (this.search || '').toLowerCase().trim();
    if (!term) return this.executives || [];
    return (this.executives || []).filter((e: any) => {
      const name = (e?.name || '').toString().toLowerCase();
      const email = (e?.email || '').toString().toLowerCase();
      const phone = (e?.phone || '').toString().toLowerCase();
      const role = (e?.role || '').toString().toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term) || role.includes(term);
    });
  }

  trackByExecId(index: number, e: any): string | number {
    return e?.id ?? index;
  }

  // ---------- Edit uploads for update form ----------
  onEditImageSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.imageFileType = file.type || '';
    const r = new FileReader();
    r.onload = (e: any) => (this.imageEditPreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedImageBase64 = base64;
    });
  }

  onEditAgreementSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.agreementFileType = file.type || '';
    const r = new FileReader();
    r.onload = (e: any) => (this.agreementEditPreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedAgreementBase64 = base64;
    });
  }

  onEditCnicSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.cnicFileType = file.type || '';
    const r = new FileReader();
    r.onload = (e: any) => (this.cnicEditPreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedCnicBase64 = base64;
    });
  }

  removeEditImage(): void { this.imageEditPreview = null; this.selectedImageBase64 = ''; this.imageFileType = ''; }
  removeEditAgreement(): void { this.agreementEditPreview = null; this.selectedAgreementBase64 = ''; this.agreementFileType = ''; }
  removeEditCnic(): void { this.cnicEditPreview = null; this.selectedCnicBase64 = ''; this.cnicFileType = ''; }

  // Match rider roles
  private isWaiter(val: any): boolean {
    try {
      if (val === Role.Rider) return true;
      const s = String(val || '').toLowerCase();
      return s.includes('rider');
    } catch {
      return false;
    }
  }

  private getExtension(path: string | null | undefined): string | null {
    try {
      const p = String(path || '').toLowerCase();
      const i = p.lastIndexOf('.');
      if (i === -1) return null;
      return p.substring(i + 1);
    } catch {
      return null;
    }
  }

  fetchExecutives(): void {
    this.loading = true;
    this.error = null;
    // Backend "allManager" is assumed to return all staff; filter to only riders
    this.staffService.getManagers().subscribe({
      next: (list: ManagerItem[]) => {
        const items = Array.isArray(list) ? list : [];
        this.executives = items.filter((x: any) => this.isWaiter(x?.role));
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load delivery executives';
      },
    });
  }

  // ---------- Add Member (same behavior as Add Manager but role fixed to waiter) ----------
  private buildAddForm(): void {
    this.addForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      cnic: [''],
      image: [null],
      agreement: [null],
    });
  }

  openAddSidebar(): void {
    this.showAddSidebar = true;
  }

  closeAddSidebar(): void {
    this.showAddSidebar = false;
    this.addForm.reset({ email: '', password: '', name: '', phone: '', cnic: '', image: null, agreement: null });
    this.removeAddImage();
    this.removeAddAgreement();
    this.removeAddCnic();
  }

  isPdf(ft: string): boolean {
    return (ft || '').toLowerCase().includes('pdf');
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

  onAddImageSelect(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.imageFileType = file.type || '';
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
    const r = new FileReader();
    r.onload = (e: any) => (this.agreementPreview = e.target.result);
    r.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedAgreementBase64 = base64;
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const extension = ext === 'pdf' || this.agreementFileType.includes('pdf') ? 'pdf' : 'image';
      const agreementObject = { extension, image: base64 } as any;
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

  removeAddImage(): void {
    this.imagePreview = null;
    this.selectedImageBase64 = '';
    this.imageFileType = '';
    this.addForm?.patchValue({ image: null });
  }

  removeAddAgreement(): void {
    this.agreementPreview = null;
    this.selectedAgreementBase64 = '';
    this.agreementFileType = '';
    this.addForm?.patchValue({ agreement: null });
  }

  removeAddCnic(): void {
    this.cnicPreview = null;
    this.selectedCnicBase64 = '';
    this.cnicFileType = '';
    this.addForm?.patchValue({ cnic: '' });
  }

  onSubmitAdd(): void {
    if (!this.addForm || this.addForm.invalid) {
      this.addForm?.markAllAsTouched();
      return;
    }
    const { email, password, name, phone } = this.addForm.value;
    const agrement: string | null = this.selectedAgreementBase64
      || (typeof this.addForm.value?.agreement === 'object' ? this.addForm.value.agreement?.image : this.addForm.value?.agreement)
      || null;
    const extention: 'pdf' | 'image' | null = this.agreementFileType?.toLowerCase().includes('pdf') ? 'pdf' : (agrement ? 'image' : null);
    const image: string | null = this.selectedImageBase64 || this.addForm.value?.image || null;
    const cnic: string | null = this.selectedCnicBase64 || this.addForm.value?.cnic || null;
    const basePayload: any = { name, password, phone, role: 'rider', email, image, cnic, agrement, extention };

    const appendLocal = () => {
      const created: any = { id: Date.now(), ...basePayload };
      this.executives = [created, ...this.executives];
    };

    // Offline path: queue and update UI, do not call API
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.staffSync.queueStaff(basePayload).then(() => this.staffSync.trySync());
      appendLocal();
      this.toast.success('Saved offline. Will sync when online.');
      this.closeAddSidebar();
      return;
    }

    this.submitting = true;
    this.staffService.addManage(basePayload).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Delivery Execive added successfully');
        this.closeAddSidebar();
        this.fetchExecutives();
      },
      error: async (err) => {
        this.submitting = false;
        if (!err || err.status === 0) {
          await this.staffSync.queueStaff(basePayload);
          appendLocal();
          this.toast.success('No internet. Saved offline and will sync later.');
          this.closeAddSidebar();
          return;
        }
        const msg = err?.error?.message || 'Failed to add';
        this.toast.error(msg);
      },
    });
  }

  // ----- Update Sidebar Methods -----
  private buildUpdateForm(w: ManagerItem): void {
    this.updateForm = this.fb.group({
      id: [w?.id, [Validators.required]],
      name: [w?.name || '', [Validators.required, Validators.minLength(2)]],
      email: [w?.email || '', [Validators.required, Validators.email]],
      phone: [w?.phone || '', [Validators.required]],
      password: [w?.password || '', [Validators.minLength(6)]],
    });
  }

  openUpdateSidebar(w: ManagerItem): void {
    this.selectedItem = w;
    this.buildUpdateForm(w);
    this.showUpdateSidebar = true;
    // Seed previews from existing values so user can keep or replace
    const imgPath: string | null = (w as any)?.image ?? null;
    const cnicPath: string | null = (w as any)?.cnic ?? null;
    const agrPath: string | null = (w as any)?.agrement ?? null;
    this.imageEditPreview = imgPath || null;
    this.cnicEditPreview = cnicPath || null;
    if (agrPath) {
      const ext = this.getExtension(agrPath);
      if (ext === 'pdf') {
        this.agreementFileType = 'application/pdf';
        // preview badge indicator
        this.agreementEditPreview = agrPath;
      } else {
        this.agreementFileType = 'image/*';
        this.agreementEditPreview = agrPath;
      }
    } else {
      this.agreementEditPreview = null;
      this.agreementFileType = '';
    }
  }

  closeUpdateSidebar(): void {
    this.showUpdateSidebar = false;
    this.selectedItem = null;
  }

  onSubmitUpdate(): void {
    if (!this.updateForm || this.updateForm.invalid) {
      this.updateForm?.markAllAsTouched();
      return;
    }
    const { id, name, email, phone, password } = this.updateForm.value;
    // Include upload values if present; otherwise fall back to existing
    const existingAgr: string | null = (this.selectedItem as any)?.agrement ?? null;
    const existingImg: string | null = (this.selectedItem as any)?.image ?? null;
    const existingCnic: string | null = (this.selectedItem as any)?.cnic ?? null;

    let agrement: string | null = this.selectedAgreementBase64 || this.agreementEditPreview || existingAgr || null;
    let extention: 'pdf' | 'image' | null = null;
    if (this.selectedAgreementBase64) {
      extention = this.agreementFileType?.toLowerCase().includes('pdf') ? 'pdf' : 'image';
    } else if (existingAgr) {
      const ex = this.getExtension(existingAgr);
      extention = ex === 'pdf' ? 'pdf' : (ex ? 'image' : null);
    }
    const image = this.selectedImageBase64 || this.imageEditPreview || existingImg || null;
    const cnic = this.selectedCnicBase64 || this.cnicEditPreview || existingCnic || null;
    const payload: any = { id, name, email, phone, role: 'rider', image, cnic, agrement, extention };
    if (password) payload.password = password;
    const applyLocal = () => {
      this.executives = (this.executives || []).map((x: any) => (x.id === id ? { ...x, name, email, phone, image, cnic, agrement, extention } : x));
    };

    // Offline: queue update and update UI locally
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.staffSync.queueUpdate(payload).then(() => this.staffSync.trySync());
      applyLocal();
      this.toast.success('Saved update offline. Will sync when online.');
      this.closeUpdateSidebar();
      return;
    }

    this.updating = true;
    // Use manager update endpoint for rider
    this.staffService.updateManager(payload).subscribe({
      next: (resp) => {
        this.updating = false;
        if ((resp as any)?.error === true) {
          this.toast.error((resp as any)?.message || 'Failed to update');
          return;
        }
        this.toast.success('Updated successfully');
        this.closeUpdateSidebar();
        this.fetchExecutives();
      },
      error: async (err) => {
        this.updating = false;
        if (!err || err.status === 0) {
          await this.staffSync.queueUpdate(payload);
          applyLocal();
          this.toast.success('No internet. Update saved offline and will sync later.');
          this.closeUpdateSidebar();
          return;
        }
        const msg = err?.error?.message || 'Failed to update';
        this.toast.error(msg);
      },
    });
  }

  onDelete(w: ManagerItem): void {
    if (!w?.id) {
      this.toast.error('Invalid id');
      return;
    }
    Swal.fire({
      title: 'Delete member?',
      text: `Are you sure you want to delete ${w.name || 'this member'}? This action cannot be undone.`,
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
        // Use deleteManager endpoint per requirement
        this.staffService.deleteManager(String(w.id)).subscribe({
          next: () => {
            this.toast.success('Deleted successfully');
            this.fetchExecutives();
            this.executives = this.executives.filter((x) => x.id !== w.id);
          },
          error: (err) => {
            this.loading = false;
            const msg = err?.error?.message || 'Failed to delete';
            this.toast.error(msg);
          },
        });
      }
    });
  }
}
