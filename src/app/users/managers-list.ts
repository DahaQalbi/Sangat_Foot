import { Component, OnInit } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { StaffService } from 'src/app/services/staff.service';
import { Role } from 'src/app/enums/role.enum';
import { ManagerItem } from 'src/app/interfaces/staff.interface';

@Component({
  templateUrl: './managers-list.html',
  animations: [toggleAnimation],
})
export class ManagersListComponent implements OnInit {
  loading = false;
  error: string | null = null;
  managers: ManagerItem[] = [];

  constructor(private staffService: StaffService) {}

  ngOnInit(): void {
    this.fetchManagers();
  }

  fetchManagers(): void {
    this.loading = true;
    this.error = null;
    this.staffService.getManagers().subscribe({
      next: (list:ManagerItem[]) => {
        // Ensure only Manager role items are shown if API returns more
        this.managers =list;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load managers';
      },
    });
  }
}
