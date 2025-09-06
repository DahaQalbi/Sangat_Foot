import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';
import { ManagerItem } from 'src/app/interfaces/staff.interface';
import { Role } from 'src/app/enums/role.enum';

@Component({
  selector: 'app-update-waiter',
  templateUrl: './update-waiter.html',
  animations: [toggleAnimation],
})
export class UpdateWaiterComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  waiter: ManagerItem | null = null;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private staffService: StaffService,
    private toast: ToastService,
    public router: Router,
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
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
    });
  }

  private patchForm(w: ManagerItem) {
    this.form.patchValue({
      email: w.email || '',
      password: w.password || '',
      name: w.name || '',
      phone: w.phone || '',
    });
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
    const payload = {
      id: this.waiter.id as string | number,
      email: this.form.value.email,
      password: this.form.value.password,
      phone: this.form.value.phone,
      name: this.form.value.name,
    };

    this.submitting = true;
    this.staffService.updateWaiter(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Waiter updated successfully');
        this.router.navigate(['/users/all-waiters']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to update waiter';
        this.toast.error(msg);
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
