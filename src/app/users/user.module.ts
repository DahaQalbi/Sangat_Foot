import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

// shared module
import { SharedModule } from 'src/shared.module';

import { UserAccountSettingsComponent } from './user-account-settings';
import { ProfileComponent } from './profile';
import { AddEmployeeComponent } from './add-employee';
import { AddStaffComponent } from './add-staff';
import { ManagersListComponent } from './managers-list';
import { AllWaitersComponent } from './all-waiters';
import { UpdateManagerComponent } from './update-manager';
import { UpdateWaiterComponent } from './update-waiter';
import { RoleGuard } from 'src/app/guards/role.guard';
import { Role } from 'src/app/enums/role.enum';
import { DeliveryExecutiveComponent } from './delivery-executive';
import { DeliveryExeciveComponent } from './delivery-execive';

const routes: Routes = [
    {
        path: 'users/user-account-settings',
        component: UserAccountSettingsComponent,
        data: { title: 'Account Setting' },
    },
    { path: 'users/profile', component: ProfileComponent, data: { title: 'User Profile' } },
    { path: 'users/add-manager', component: AddEmployeeComponent, canActivate: [RoleGuard], data: { title: 'Add Manager', roles: [Role.Admin] } },
    { path: 'users/add-staff', component: AddStaffComponent, canActivate: [RoleGuard], data: { title: 'Add Staff', roles: [Role.Admin] } },
    { path: 'users/all-manager', component: ManagersListComponent, canActivate: [RoleGuard], data: { title: 'All Manager', roles: [Role.Admin] } },
    { path: 'users/all-staff', component: ManagersListComponent, canActivate: [RoleGuard], data: { title: 'All Staff', roles: [Role.Admin] } },
    { path: 'users/all-waiters', component: AllWaitersComponent, canActivate: [RoleGuard], data: { title: 'All Waiters', roles: [Role.Admin] } },
    { path: 'users/update-manager', component: UpdateManagerComponent, canActivate: [RoleGuard], data: { title: 'Update Manager', roles: [Role.Admin] } },
    { path: 'users/update-waiter', component: UpdateWaiterComponent, canActivate: [RoleGuard], data: { title: 'Update Waiter', roles: [Role.Admin] } },
    { path: 'users/delivery-executive', component: DeliveryExecutiveComponent, canActivate: [RoleGuard], data: { title: 'Delivery Executive', roles: [Role.Admin] } },
    { path: 'users/delivery-execive', component: DeliveryExeciveComponent, canActivate: [RoleGuard], data: { title: 'Delivery Execive', roles: [Role.Admin] } },
];

@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, ReactiveFormsModule, SharedModule.forRoot()],
    declarations: [UserAccountSettingsComponent, ProfileComponent, AddEmployeeComponent, AddStaffComponent, ManagersListComponent, AllWaitersComponent, UpdateManagerComponent, UpdateWaiterComponent, DeliveryExecutiveComponent, DeliveryExeciveComponent],
})
export class UsersModule {}
