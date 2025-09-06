import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { ManagerItem, UpdateManagerPayload } from 'src/app/interfaces/staff.interface';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';
import { Role } from 'src/app/enums/role.enum';

@Component({
  selector: 'app-update-manager',
  templateUrl: './update-manager.html',
  animations: [toggleAnimation],
})
export class UpdateManagerComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  manager: ManagerItem | null = null;
  // expose roles to match AddEmployee UI; keep disabled for update
  roles = [Role.Manager, Role.Waiter];
  showPassword = false;

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
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      role: [{ value: Role.Manager, disabled: true }],
    });
  }

  private patchForm(m: ManagerItem) {
    this.form.patchValue({
      email: m.email || '',
      password: m.password || '',
      name: m.name || '',
      phone: m.phone || '',
      role: m.role || Role.Manager,
    });
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
    const payload: UpdateManagerPayload = {
      id: this.manager.id as string | number,
      email: this.form.value.email,
      password: this.form.value.password,
      phone: this.form.value.phone,
      name: this.form.value.name,
    };

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
}
