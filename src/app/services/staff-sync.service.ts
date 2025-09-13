import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IdbService } from './idb.service';
import { StaffService } from './staff.service';

export interface PendingStaffRecord {
  id: number; // temporary id for IDB
  payload: any; // staff payload to send to API
  createdAt: number;
  action: 'create' | 'update';
}

@Injectable({ providedIn: 'root' })
export class StaffSyncService {
  private syncing = false;

  constructor(private idb: IdbService, private staffApi: StaffService) {
    // Auto-attempt sync when connection is back
    if (typeof window !== 'undefined' && 'addEventListener' in window) {
      window.addEventListener('online', () => {
        this.trySync();
      });
    }
  }

  async queueStaff(payload: any, action: 'create' | 'update' = 'create'): Promise<void> {
    const record: PendingStaffRecord = {
      id: Date.now(),
      payload,
      createdAt: Date.now(),
      action,
    };
    await this.idb.putOne<PendingStaffRecord>('pending_staff', record);
  }

  async queueUpdate(payload: any): Promise<void> {
    return this.queueStaff(payload, 'update');
  }

  // Attempt to sync all pending staff records. Safe to call multiple times.
  async trySync(): Promise<void> {
    if (this.syncing) return; // prevent overlapping syncs
    this.syncing = true;
    try {
      const pending = await this.idb.getAll<PendingStaffRecord>('pending_staff');
      for (const rec of pending) {
        try {
          // Decide endpoint based on role
          const role: string = String(rec.payload?.role || '').toLowerCase();
          if (rec.action === 'update') {
            if (role === 'waiter') {
              await firstValueFrom(this.staffApi.updateWaiter(rec.payload));
            } else {
              await firstValueFrom(this.staffApi.updateManager(rec.payload));
            }
          } else {
            if (role === 'waiter') {
              await firstValueFrom(this.staffApi.addWaiter(rec.payload));
            } else {
              // For admin/manager/rider/cook/consumers we use addManager endpoint per current backend API surface
              await firstValueFrom(this.staffApi.addManage(rec.payload));
            }
          }
          // Remove from pending if success
          await this.idb.deleteByKey('pending_staff', rec.id);
        } catch {
          // Stop further processing on first failure to avoid rapid retries
          // Leave remaining records for next sync attempt
          break;
        }
      }
    } finally {
      this.syncing = false;
    }
  }
}
