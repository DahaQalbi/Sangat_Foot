import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { StaffSyncService } from 'src/app/services/staff-sync.service';
import { ManagerItem, AddManagePayload } from 'src/app/interfaces/staff.interface';
import { Role } from 'src/app/enums/role.enum';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './add-staff.html',
  animations: [toggleAnimation],
})
export class AddStaffComponent implements OnInit {
  form!: FormGroup;
  roles = [Role.Admin, Role.Manager, Role.Waiter, Role.Rider, Role.Cook, Role.Consumer];
  // expose enum to template for comparisons
  Role = Role;
  loadingManagers = false;
  managers: ManagerItem[] = [];
  error: string | null = null;
  submitting = false;
  // file handling
  selectedImageBase64: string = '';
  selectedAgreementBase64: string = '';
  selectedCnicBase64: string = '';
  agreementFileType: string = '';
  imageFileType: string = '';
  cnicFileType: string = '';
  imagePreview: string | null = null;
  agreementPreview: string | null = null;
  cnicPreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private staffService: StaffService,
    private toast: ToastService,
    private router: Router,
    private staffSync: StaffSyncService,
  ) {
    this.buildForm();
  }

  ngOnInit(): void {
    this.fetchManagers();
  }

  private buildForm() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: [Role.Manager, [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      cnic: ['', [Validators.required]],
      image: [null],
      agreement: [null],
      // optional: choose a manager when adding a waiter
      managerId: [null],
    });
  }

  fetchManagers(): void {
    this.loadingManagers = true;
    this.error = null;
    this.staffService.getManagers().subscribe({
      next: (list) => {
        this.managers = list || [];
        this.loadingManagers = false;
      },
      error: (err) => {
        this.loadingManagers = false;
        this.error = err?.error?.message || 'Failed to load managers';
        this.toast.error(this.error || 'Failed to load managers');
      },
    });
  }

  // --- File handlers (base64) ---
  onImageSelect(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.imageFileType = file.type || '';
    // Preview
    const reader = new FileReader();
    reader.onload = (e: any) => (this.imagePreview = e.target.result);
    reader.readAsDataURL(file);
    // Base64 for API
    this.convertToBase64(file).then((base64) => {
      this.selectedImageBase64 = base64;
      this.form.patchValue({ image: base64 });
    });
  }

  onAgreementSelect(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.agreementFileType = file.type || '';
    // Preview
    const reader = new FileReader();
    reader.onload = (e: any) => (this.agreementPreview = e.target.result);
    reader.readAsDataURL(file);
    this.convertToBase64(file).then((base64) => {
      this.selectedAgreementBase64 = base64;
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const extension = ext === 'pdf' || this.agreementFileType.includes('pdf') ? 'pdf' : 'image';
      const agreementObject = { extension, image: base64 };
      this.form.patchValue({ agreement: agreementObject });
    });
  }

  onCnicSelect(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.cnicFileType = file.type || '';
    // Preview
    const reader = new FileReader();
    reader.onload = (e: any) => (this.cnicPreview = e.target.result);
    reader.readAsDataURL(file);
    // Base64 for API
    this.convertToBase64(file).then((base64) => {
      this.selectedCnicBase64 = base64;
      this.form.patchValue({ cnic: base64 });
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { managerId, role, email, password, name, phone, cnic, image, agreement } = this.form.value;
    const payload: any = {
      email,
      password,
      role,
      name,
      phone,
      cnic, // already base64 via onCnicSelect
      image, // base64 via onImageSelect
      agreement, // { extension: 'pdf'|'img', image: base64 }
    } as Partial<AddManagePayload> as any;

    const goAfter = () => {
      if (role === Role.Waiter) this.router.navigate(['/users/all-waiters']);
      else this.router.navigate(['/users/all-manager']);
    };

    // Offline path: queue to IDB and navigate immediately
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const toQueue = role === Role.Waiter ? { ...payload, managerId } : payload;
      this.staffSync.queueStaff({ ...toQueue, role: String(role).toLowerCase() }).then(() => this.staffSync.trySync());
      this.toast.success('Saved offline. Will sync when online.');
      goAfter();
      return;
    }

    this.submitting = true;
 
      const managePayload = { ...payload, role: String(role).toLowerCase() } as AddManagePayload;
      this.staffService.addManage(managePayload).subscribe({
        next: () => {
          this.submitting = false;
          this.toast.success('Manager added successfully');
          goAfter();
        },
        error: async (err) => {
          this.submitting = false;
          if (!err || err.status === 0) {
            await this.staffSync.queueStaff(managePayload);
            this.toast.success('No internet. Saved offline and will sync later.');
            goAfter();
            return;
          }
          const msg = err?.error?.message || 'Failed to add manager';
          this.toast.error(msg);
        },
      });

  }

  // --- Helpers ---
  isPdf(fileType: string): boolean {
    return (fileType || '').toLowerCase().includes('pdf');
  }

  removeImage(): void {
    this.imagePreview = null;
    this.selectedImageBase64 = '';
    this.imageFileType = '';
    this.form.patchValue({ image: null });
  }

  removeAgreement(): void {
    this.agreementPreview = null;
    this.selectedAgreementBase64 = '';
    this.agreementFileType = '';
    this.form.patchValue({ agreement: null });
  }

  removeCnic(): void {
    this.cnicPreview = null;
    this.selectedCnicBase64 = '';
    this.cnicFileType = '';
    this.form.patchValue({ cnic: '' });
  }
}
