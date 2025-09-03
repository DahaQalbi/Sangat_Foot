import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';

import { UserAccountSettingsComponent } from './user-account-settings';
import { ProfileComponent } from './profile';

const routes: Routes = [
    {
        path: 'users/user-account-settings',
        component: UserAccountSettingsComponent,
        data: { title: 'Account Setting' },
    },
    { path: 'users/profile', component: ProfileComponent, data: { title: 'User Profile' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [UserAccountSettingsComponent, ProfileComponent],
})
export class UsersModule {}
