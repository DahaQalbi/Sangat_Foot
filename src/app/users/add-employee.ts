import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { AddManagePayload } from 'src/app/interfaces/staff.interface';
import { Role } from 'src/app/enums/role.enum';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './add-employee.html',
  animations: [toggleAnimation],
})
export class AddEmployeeComponent {
  form!: FormGroup;
  submitting = false;
  roles = [Role.Manager, Role.Waiter];

  constructor(
    private fb: FormBuilder,
    private staffService: StaffService,
    private toast: ToastService,
    private router: Router,
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
      next: () => {
        this.submitting = false;
        this.toast.success('Employee added successfully');
        this.router.navigate(['/users/profile']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to add employee';
        this.toast.error(msg);
      },
    });
  }
}
