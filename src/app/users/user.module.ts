import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

// shared module
import { SharedModule } from 'src/shared.module';

import { UserAccountSettingsComponent } from './user-account-settings';
import { ProfileComponent } from './profile';
import { AddEmployeeComponent } from './add-employee';
import { ManagersListComponent } from './managers-list';
import { AllWaitersComponent } from './all-waiters';
import { UpdateManagerComponent } from './update-manager';
import { UpdateWaiterComponent } from './update-waiter';
const routes: Routes = [
    {
        path: 'users/user-account-settings',
        component: UserAccountSettingsComponent,
        data: { title: 'Account Setting' },
    },
    { path: 'users/profile', component: ProfileComponent, data: { title: 'User Profile' } },
    { path: 'users/add-manager', component: AddEmployeeComponent, data: { title: 'Add Manager' } },
    { path: 'users/all-manager', component: ManagersListComponent, data: { title: 'All Manager' } },
    { path: 'users/all-waiters', component: AllWaitersComponent, data: { title: 'All Waiters' } },
    { path: 'users/update-manager', component: UpdateManagerComponent, data: { title: 'Update Manager' } },
    { path: 'users/update-waiter', component: UpdateWaiterComponent, data: { title: 'Update Waiter' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, ReactiveFormsModule, SharedModule.forRoot()],
    declarations: [UserAccountSettingsComponent, ProfileComponent, AddEmployeeComponent, ManagersListComponent, AllWaitersComponent, UpdateManagerComponent, UpdateWaiterComponent],
})
export class UsersModule {}
