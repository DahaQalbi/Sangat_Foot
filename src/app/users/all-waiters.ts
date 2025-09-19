import { Component, OnInit } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { ManagerItem } from 'src/app/interfaces/staff.interface';
import { Router } from '@angular/router';
import { IdbService } from 'src/app/services/idb.service';
import { ToastService } from 'src/app/services/toast.service';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  templateUrl: './all-waiters.html',
  animations: [toggleAnimation],
})
export class AllWaitersComponent implements OnInit {
  loading = false;
  error: string | null = null;
  waiters: ManagerItem[] = [];
  passwordVisible: Record<string, boolean> = {};
  
  // Sidebar modal properties
  showSidebar = false;
  selectedWaiter: ManagerItem | null = null;

  // Update sidebar (edit waiter)
  showUpdateSidebar = false;
  updateForm!: FormGroup;
  updating = false;

  constructor(
    private staffService: StaffService,
    private router: Router,
    private toast: ToastService,
    private idb: IdbService,
    private fb: FormBuilder,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadFromCache();
    this.fetchWaiters();
  }

  fetchWaiters(): void {
    // Background refresh: do not block UI if cache has already loaded
    if (!this.waiters.length) this.loading = true;
    this.error = null;
    this.staffService.getManagers().subscribe({
      next: async (list: ManagerItem[]) => {
        list.filter((w: any) => w?.role === 'waiter');
        const normalized = (list || []).map((w: any, idx: number) => {
          const rawId = w?.id ?? w?._id ?? w?.uid;
          let id: any;
          if (rawId !== undefined && rawId !== null && rawId !== '') {
            const asNum = Number(rawId);
            id = isNaN(asNum) ? String(rawId) : asNum;
          } else {
            id = `w_${Date.now()}_${idx}`;
          }
          return { ...w, id } as ManagerItem;
        });
        this.waiters = normalized;
        this.loading = false;
        // Update cache
        try {
          await this.idb.replaceAll('waiters', this.waiters as any[]);
          // Verify and patch any missing records due to unexpected IDB issues
          const cached = await this.idb.getAll<ManagerItem>('waiters');
          if ((cached?.length || 0) !== this.waiters.length) {
            const cachedIds = new Set((cached || []).map((c: any) => String(c.id)));
            const missing = (this.waiters as any[]).filter((w: any) => !cachedIds.has(String(w.id)));
            if (missing.length) {
              await this.idb.putAll('waiters', missing);
            }
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Failed to update waiters cache', e);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load waiters';
      },
    });
  }

  private async loadFromCache(): Promise<void> {
    try {
      const cached = await this.idb.getAll<ManagerItem>('waiters');
      if (Array.isArray(cached) && cached.length) {
        this.waiters = cached;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read waiters cache', e);
    }
  }

  // Normalize employment/created date across different possible field names and formats
  employmentDate(w: any): Date | null {
    const candidates = [
      w?.employmentDate,
      w?.created_at,
      w?.createdAt,
      w?.createdOn,
      w?.createdDate,
      w?.joinDate,
      w?.joined_at,
    ];

    const raw = candidates.find((v) => v !== undefined && v !== null && v !== '');
    if (raw === undefined || raw === null || raw === '') return null;

    // If it's a number, detect seconds vs milliseconds
    if (typeof raw === 'number') {
      const ms = raw < 1e12 ? raw * 1000 : raw; // treat < 10^12 as seconds
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }

    // If it's a string, try to parse; also handle numeric strings
    if (typeof raw === 'string') {
      const num = Number(raw);
      if (!isNaN(num)) {
        const ms = num < 1e12 ? num * 1000 : num;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
      }
      // Handle formats like 'YYYY-MM-DD HH:mm:ss' by converting to 'YYYY-MM-DDTHH:mm:ss'
      const normalized = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)
        ? raw.replace(' ', 'T')
        : raw;
      const d = new Date(normalized);
      return isNaN(d.getTime()) ? null : d;
    }

    // If it's already a Date
    if (raw instanceof Date) {
      return isNaN(raw.getTime()) ? null : raw;
    }

    return null;
  }

  onEdit(w: ManagerItem): void {
    this.openUpdateSidebar(w);
  }

  onDelete(w: ManagerItem): void {
    if (!w?.id) {
      this.toast.error('Invalid waiter id');
      return;
    }
    Swal.fire({
      title: 'Delete waiter?',
      text: `Are you sure you want to delete ${w.name || 'this waiter'}? This action cannot be undone.`,
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
        this.staffService.deleteManager(w.id as any).subscribe({
          next: () => {
            this.toast.success('Waiter deleted successfully');
            // Update UI immediately
            this.fetchWaiters();
            this.waiters = this.waiters.filter((x) => x.id !== w.id);
            // Update cache (fire and forget)
            this.idb.clearStore('waiters').then(() => this.idb.putAll('waiters', this.waiters as any[]));
          },
          error: (err) => {
            this.loading = false;
            const msg = err?.error?.message || 'Failed to delete waiter';
            this.toast.error(msg);
          },
        });
      }
    });
  }

  // Password helpers
  isPasswordVisible(w: ManagerItem): boolean {
    const key = String(w?.id ?? '');
    return !!this.passwordVisible[key];
  }

  togglePassword(w: ManagerItem): void {
    const key = String(w?.id ?? '');
    this.passwordVisible[key] = !this.passwordVisible[key];
  }

  masked(pw?: string): string {
    if (!pw) return '-';
    return '•'.repeat(Math.min(pw.length, 12));
  }

  // Sidebar modal methods
  onView(w: ManagerItem): void {
    this.selectedWaiter = w;
    this.showSidebar = true;
  }

  closeSidebar(): void {
    this.showSidebar = false;
    this.selectedWaiter = null;
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
    this.selectedWaiter = w;
    this.buildUpdateForm(w);
    this.showUpdateSidebar = true;
  }

  closeUpdateSidebar(): void {
    this.showUpdateSidebar = false;
    this.selectedWaiter = null;
  }

  onSubmitUpdate(): void {
    if (!this.updateForm || this.updateForm.invalid) {
      this.updateForm?.markAllAsTouched();
      return;
    }
    const { id, name, email, phone, password } = this.updateForm.value;
    const payload: any = { id, name, email, phone, role: 'waiter' };
    if (password) payload.password = password;
    this.updating = true;
    // Use updateManager endpoint for waiter updates per requirement
    this.staffService.updateManager(payload).subscribe({
      next: (resp) => {
        this.updating = false;
        if ((resp as any)?.error === true) {
          this.toast.error((resp as any)?.message || 'Failed to update waiter');
          return;
        }
        this.toast.success('Waiter updated successfully');
        this.closeUpdateSidebar();
        this.fetchWaiters();
      },
      error: (err) => {
        this.updating = false;
        const msg = err?.error?.message || 'Failed to update waiter';
        this.toast.error(msg);
      },
    });
  }
}
