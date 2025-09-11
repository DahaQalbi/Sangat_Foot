import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { ManagerItem } from 'src/app/interfaces/staff.interface';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';
import { Role } from 'src/app/enums/role.enum';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-update-manager',
  templateUrl: './update-manager.html',
  animations: [toggleAnimation],
})
export class UpdateManagerComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  manager: ManagerItem | null = null;
  roles = [Role.Manager, Role.Waiter];
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
    private router: Router,
  ) {
    this.buildForm();
  }

  ngOnInit(): void {
    // Prefer history.state as it works on refresh as well (if available)
    const state = (history.state as any) || {};
    const managerFromState: ManagerItem | undefined = state.manager;
    this.manager = managerFromState || null;
    if (this.manager) {
      this.patchForm(this.manager);
    } else {
      // If opened directly without state, navigate back
      this.toast.error('No manager selected to update');
      this.router.navigate(['/users/all-manager']);
    }
  }

  private buildForm() {
    // Same structure as AddEmployee
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: [Role.Manager, [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      cnic: [null],
      image: [null],
      agreement: [null],
    });
  }

  private patchForm(m: ManagerItem) {
    this.form.patchValue({
      email: (m as any).email || '',
      password: (m as any).password || '',
      name: (m as any).name || '',
      phone: (m as any).phone || '',
      role: (m as any).role || Role.Manager,
      // cnic, image, agreement left null unless you want to hydrate from API paths
    });

    // Hydrate previews from API paths if present
    const imagePath = (m as any).image || '';
    const cnicPath = (m as any).cnic || '';
    const agreementPath = (m as any).agreement || (m as any).agrement || '';

    if (imagePath) this.imagePreview = this.fullSrc(String(imagePath).trim());
    if (cnicPath) this.cnicPreview = this.fullSrc(String(cnicPath).trim());
    if (agreementPath) {
      const path = String(agreementPath).trim();
      this.agreementPreview = this.fullSrc(path);
      const ext = path.split('.').pop()?.toLowerCase();
      this.agreementFileType = ext === 'pdf' ? 'application/pdf' : 'image/*';
    }
  }

  onSubmit() {
    if (!this.manager || !this.manager.id) {
      this.toast.error('Invalid manager to update');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Same payload shape as AddEmployee, plus id
    const payload: any = { id: this.manager.id, ...this.form.value };

    this.submitting = true;
    this.staffService.updateManager(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Manager updated successfully');
        this.router.navigate(['/users/all-manager']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to update manager';
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
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
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
