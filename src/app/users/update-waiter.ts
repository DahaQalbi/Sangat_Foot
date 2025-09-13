import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';
import { ManagerItem } from 'src/app/interfaces/staff.interface';
import { Role } from 'src/app/enums/role.enum';
import { environment } from 'src/environments/environment';
import { StaffSyncService } from 'src/app/services/staff-sync.service';
import { IdbService } from 'src/app/services/idb.service';

@Component({
  selector: 'app-update-waiter',
  templateUrl: './update-waiter.html',
  animations: [toggleAnimation],
})
export class UpdateWaiterComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  waiter: ManagerItem | null = null;
  roles = [Role.Admin, Role.Manager, Role.Waiter, Role.Rider, Role.Cook, Role.Consumer];
  showPassword = false;

  // File handling (same as AddEmployee)
  selectedImageBase64: string = '';
  selectedAgreementBase64: string = '';
  selectedCnicBase64: string = '';
  imagePreview: string | null = null;
  agreementPreview: string | null = null;
  cnicPreview: string | null = null;
  agreementFileType: string = '';
  cnicFileType: string = '';
  imageFileType: string = '';
  showModal: boolean = false;
  modalContent: string = '';
  modalType: 'image' | 'pdf' = 'image';
  public imgUrl = environment.imgUrl;

  constructor(
    private fb: FormBuilder,
    private staffService: StaffService,
    private toast: ToastService,
    public router: Router,
    private staffSync: StaffSyncService,
    private idb: IdbService,
  ) {
    this.buildForm();
  }

  ngOnInit(): void {
    const st: any = history.state?.waiter;
    this.waiter = st || null;
    if (this.waiter) {
      this.patchForm(this.waiter);
    } else {
      this.toast.error('No waiter selected to update');
      this.router.navigate(['/users/all-waiters']);
    }
  }

  private buildForm() {
    // Same as AddEmployee
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: [Role.Waiter, [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      cnic: [null],
      image: [null],
      agreement: [null],
    });
  }

  private patchForm(w: ManagerItem) {
    this.form.patchValue({
      email: (w as any).email || '',
      password: (w as any).password || '',
      name: (w as any).name || '',
      phone: (w as any).phone || '',
      role: Role.Waiter,
    });

    // Hydrate previews from API paths
    const imagePath = (w as any).image || '';
    const cnicPath = (w as any).cnic || '';
    const agreementPath = (w as any).agreement || (w as any).agrement || '';

    if (imagePath) this.imagePreview = this.fullSrc(String(imagePath).trim());
    if (cnicPath) this.cnicPreview = this.fullSrc(String(cnicPath).trim());
    if (agreementPath) {
      const path = String(agreementPath).trim();
      this.agreementPreview = this.fullSrc(path);
      const ext = path.split('.').pop()?.toLowerCase();
      this.agreementFileType = ext === 'pdf' ? 'application/pdf' : 'image/*';
    }
  }

  onSubmit(): void {
    if (!this.waiter || !this.waiter.id) {
      this.toast.error('Invalid waiter to update');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Same payload as AddEmployee, plus id
    const payload: any = { id: this.waiter.id as string | number, ...this.form.value };

    const applyLocal = async () => {
      try {
        const existing = await this.idb.getByKey<any>('waiters', payload.id);
        await this.idb.putAll('waiters', [{ ...(existing || {}), ...payload }]);
      } catch {}
    };

    // Offline: queue update and update cache
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.staffSync.queueUpdate({ ...payload, role: 'waiter' }).then(() => this.staffSync.trySync());
      applyLocal();
      this.toast.success('Saved update offline. Will sync when online.');
      this.router.navigate(['/users/all-waiters']);
      return;
    }

    this.submitting = true;
    this.staffService.updateWaiter({ ...payload, role: 'waiter' }).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Waiter updated successfully');
        this.router.navigate(['/users/all-waiters']);
      },
      error: async (err) => {
        this.submitting = false;
        if (!err || err.status === 0) {
          await this.staffSync.queueUpdate({ ...payload, role: 'waiter' });
          await applyLocal();
          this.toast.success('No internet. Update saved offline and will sync later.');
          this.router.navigate(['/users/all-waiters']);
          return;
        }
        const msg = err?.error?.message || 'Failed to update waiter';
        this.toast.error(msg);
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // --- Helpers & file handling copied from AddEmployee ---
  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFileType = file.type;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.imagePreview = e.target.result);
      reader.readAsDataURL(file);
      this.convertToBase64(file).then((base64) => {
        this.selectedImageBase64 = base64;
        this.form.patchValue({ image: base64 });
      });
    }
  }

  removeImage() {
    this.imagePreview = null;
    this.selectedImageBase64 = '';
    this.imageFileType = '';
    this.form.patchValue({ image: null });
    const fileInput = document.getElementById('Image') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onAgreementSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.agreementFileType = file.type;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.agreementPreview = e.target.result);
      reader.readAsDataURL(file);
      this.convertToBase64(file).then((base64) => {
        this.selectedAgreementBase64 = base64;
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const agreementObject = { extension, image: base64 };
        this.form.patchValue({ agreement: agreementObject });
      });
    }
  }

  removeAgreement() {
    this.agreementPreview = null;
    this.selectedAgreementBase64 = '';
    this.agreementFileType = '';
    this.form.patchValue({ agreement: null });
    const fileInput = document.getElementById('Agreement') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onCnicSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.cnicFileType = file.type;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.cnicPreview = e.target.result);
      reader.readAsDataURL(file);
      this.convertToBase64(file).then((base64) => {
        this.selectedCnicBase64 = base64;
        this.form.patchValue({ cnic: base64 });
      });
    }
  }

  removeCnic() {
    this.cnicPreview = null;
    this.selectedCnicBase64 = '';
    this.cnicFileType = '';
    this.form.patchValue({ cnic: null });
    const fileInput = document.getElementById('Cnic') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  openModal(type: 'agreement' | 'cnic' | 'image') {
    switch (type) {
      case 'agreement':
        this.modalContent = this.agreementPreview || '';
        this.modalType = this.agreementFileType.includes('pdf') ? 'pdf' : 'image';
        break;
      case 'cnic':
        this.modalContent = this.cnicPreview || '';
        this.modalType = 'image';
        break;
      case 'image':
        this.modalContent = this.imagePreview || '';
        this.modalType = 'image';
        break;
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.modalContent = '';
  }

  isPdf(fileType: string): boolean {
    return fileType.includes('pdf');
  }

  isDataLikeUrl(val: string | null | undefined): boolean {
    if (!val) return false;
    return /^(data:|blob:|https?:\/\/)/i.test(val);
  }

  fullSrc(val: string | null): string {
    if (!val) return '';
    return this.isDataLikeUrl(val) ? val : `${this.imgUrl}${val}`;
  }

  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }
}
