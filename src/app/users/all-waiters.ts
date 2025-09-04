import { Component, OnInit } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { ManagerItem } from 'src/app/interfaces/staff.interface';

@Component({
  templateUrl: './all-waiters.html',
  animations: [toggleAnimation],
})
export class AllWaitersComponent implements OnInit {
  loading = false;
  error: string | null = null;
  waiters: ManagerItem[] = [];

  constructor(private staffService: StaffService) {}

  ngOnInit(): void {
    this.fetchWaiters();
  }

  fetchWaiters(): void {
    this.loading = true;
    this.error = null;
    this.staffService.getWaiters().subscribe({
      next: (list: ManagerItem[]) => {
        this.waiters = list;
        if (this.waiters && this.waiters.length) {
          // Debug logs to inspect returned date fields
          // Remove after verifying the correct field
          // eslint-disable-next-line no-console
          console.log('Waiters[0]:', this.waiters[0]);
          // eslint-disable-next-line no-console
          console.log('Waiters[0] keys:', Object.keys(this.waiters[0] as any));
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load waiters';
      },
    });
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
}
