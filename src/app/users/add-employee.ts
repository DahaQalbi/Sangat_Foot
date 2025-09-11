import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { AddManagePayload } from 'src/app/interfaces/staff.interface';
import { Role } from 'src/app/enums/role.enum';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';
import { IdbService } from 'src/app/services/idb.service';
import { environment } from 'src/environments/environment';

@Component({
  templateUrl: './add-employee.html',
  animations: [toggleAnimation],
})
export class AddEmployeeComponent {
  form!: FormGroup;
  submitting = false;
  roles = [Role.Manager, Role.Waiter];
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
public imgUrl=environment.imgUrl;
  constructor(
    private fb: FormBuilder,
    private staffService: StaffService,
    private toast: ToastService,
    private router: Router,
    private idb: IdbService,
  ) {
    this.buildForm();
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
    });
  }

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFileType = file.type;
      // Create preview URL for display
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);

      // Convert to base64 for API
      this.convertToBase64(file).then(base64 => {
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
    // Reset file input
    const fileInput = document.getElementById('Image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onAgreementSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.agreementFileType = file.type;
      // Create preview URL for display
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.agreementPreview = e.target.result;
      };
      reader.readAsDataURL(file);

      // Convert to base64 for API
      this.convertToBase64(file).then(base64 => {
        this.selectedAgreementBase64 = base64;
        // Get file extension
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        // Create object with extension and base64
        const agreementObject = {
          extension: extension,
          image: base64
        };
        this.form.patchValue({ agreement: agreementObject });
      });
    }
  }

  onCnicSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.cnicFileType = file.type;
      // Create preview URL for display
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.cnicPreview = e.target.result;
      };
      reader.readAsDataURL(file);

      // Convert to base64 for API
      this.convertToBase64(file).then(base64 => {
        this.selectedCnicBase64 = base64;
        // CNIC image should be sent under the 'cnic' field
        this.form.patchValue({ cnic: base64 });
      });
    }
  }

  removeAgreement() {
    this.agreementPreview = null;
    this.selectedAgreementBase64 = '';
    this.agreementFileType = '';
    this.form.patchValue({ agreement: null });
    const fileInput = document.getElementById('Agreement') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  removeCnic() {
    this.cnicPreview = null;
    this.selectedCnicBase64 = '';
    this.cnicFileType = '';
    // Clear CNIC field as we use this upload for CNIC image
    this.form.patchValue({ cnic: null });
    const fileInput = document.getElementById('Cnic') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  openModal(type: 'agreement' | 'cnic' | 'image') {
    switch(type) {
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

  // Build image source: use raw value when it's a data/blob/http(s) URL,
  // otherwise prefix with API base imgUrl for server-provided relative paths
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
        // Remove data:image/jpeg;base64, prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload: AddManagePayload = this.form.value;

    this.submitting = true;
    this.staffService.addManage(payload).subscribe({
      next: async (res) => {
        this.submitting = false;
        this.toast.success('Employee added successfully');
        try {
          // Prefer created entity from API response; fallback to submitted payload
          const created: any = (res && (res.data || res.user || res.created || res.result)) || {
            ...payload,
            id: Date.now(),
          };
          // Ensure role is set on created record for downstream usage
          if (!created.role) created.role = payload.role;
          // Ensure we always have an id (some APIs return uid or _id)
          if (!created.id) {
            created.id = created._id || created.uid || Date.now();
          }
          // Normalize role string if backend returns lowercase
          if (typeof created.role === 'string') {
            const r = created.role.toLowerCase();
            if (r.includes('waiter')) created.role = Role.Waiter;
            else if (r.includes('manager')) created.role = Role.Manager;
          }
          const store = payload.role === Role.Waiter ? 'waiters' : 'managers';
          // Append to IndexedDB store without clearing
          await this.idb.putAll(store, [created]);
        } catch (e) {
          // ignore cache write failures
          // eslint-disable-next-line no-console
          console.warn('Failed to cache new employee', e);
        }
        if(payload.role === Role.Waiter){
          this.router.navigate(['/users/all-waiters']);
        }else{
          this.router.navigate(['/users/all-manager']);
        }
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to add employee';
        this.toast.error(msg);
      },
    });
  }
}
