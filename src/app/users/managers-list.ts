import { Component, OnInit } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { Role } from 'src/app/enums/role.enum';
import { ManagerItem } from 'src/app/interfaces/staff.interface';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/services/toast.service';
import { IdbService } from 'src/app/services/idb.service';
import Swal from 'sweetalert2';

@Component({
  templateUrl: './managers-list.html',
  animations: [toggleAnimation],
})
export class ManagersListComponent implements OnInit {
  loading = false;
  error: string | null = null;
  managers: ManagerItem[] = [];

  constructor(
    private staffService: StaffService,
    private router: Router,
    private toast: ToastService,
    private idb: IdbService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadFromCache();
    this.fetchManagers();
  }

  fetchManagers(): void {
    // Background refresh if cache already filled
    if (!this.managers.length) this.loading = true;
    this.error = null;
    this.staffService.getManagers().subscribe({
      next: async (list: ManagerItem[]) => {
        this.managers = list || [];
        this.loading = false;
        try {
          await this.idb.clearStore('managers');
          await this.idb.putAll('managers', this.managers as any[]);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Failed to update managers cache', e);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load managers';
      },
    });
  }

  private async loadFromCache(): Promise<void> {
    try {
      const cached = await this.idb.getAll<ManagerItem>('managers');
      if (Array.isArray(cached) && cached.length) {
        this.managers = cached;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read managers cache', e);
    }
  }

  onEdit(m: ManagerItem): void {
    this.router.navigate(['/users/update-manager'], { state: { manager: m } });
  }

  onDelete(m: ManagerItem): void {
    if (!m?.id) {
      this.toast.error('Invalid manager id');
      return;
    }
    Swal.fire({
      title: 'Delete manager?',
      text: `Are you sure you want to delete ${m.name || 'this manager'}? This action cannot be undone.`,
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
        this.staffService.deleteManager(String(m.id)).subscribe({
          next: () => {
            this.toast.success('Manager deleted successfully');
            // Update UI and cache immediately
            this.managers = this.managers.filter((x) => x.id !== m.id);
            this.idb.clearStore('managers').then(() => this.idb.putAll('managers', this.managers as any[]));
          },
          error: (err) => {
            this.loading = false;
            const msg = err?.error?.message || 'Failed to delete manager';
            this.toast.error(msg);
          },
        });
      }
    });
  }
}
