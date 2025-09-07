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
import { RoleGuard } from 'src/app/guards/role.guard';
import { Role } from 'src/app/enums/role.enum';
const routes: Routes = [
    {
        path: 'users/user-account-settings',
        component: UserAccountSettingsComponent,
        data: { title: 'Account Setting' },
    },
    { path: 'users/profile', component: ProfileComponent, data: { title: 'User Profile' } },
    { path: 'users/add-manager', component: AddEmployeeComponent, canActivate: [RoleGuard], data: { title: 'Add Manager', roles: [Role.Admin] } },
    { path: 'users/all-manager', component: ManagersListComponent, canActivate: [RoleGuard], data: { title: 'All Manager', roles: [Role.Admin] } },
    { path: 'users/all-waiters', component: AllWaitersComponent, canActivate: [RoleGuard], data: { title: 'All Waiters', roles: [Role.Admin] } },
    { path: 'users/update-manager', component: UpdateManagerComponent, canActivate: [RoleGuard], data: { title: 'Update Manager', roles: [Role.Admin] } },
    { path: 'users/update-waiter', component: UpdateWaiterComponent, canActivate: [RoleGuard], data: { title: 'Update Waiter', roles: [Role.Admin] } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, ReactiveFormsModule, SharedModule.forRoot()],
    declarations: [UserAccountSettingsComponent, ProfileComponent, AddEmployeeComponent, ManagersListComponent, AllWaitersComponent, UpdateManagerComponent, UpdateWaiterComponent],
})
export class UsersModule {}
