import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { AddManagePayload } from 'src/app/interfaces/staff.interface';
import { Role } from 'src/app/enums/role.enum';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';
import { IdbService } from 'src/app/services/idb.service';

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
