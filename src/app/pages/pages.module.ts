import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';

import { ContactUsBoxedComponent } from './contact-us-boxed';
import { ContactUsCoverComponent } from './contact-us-cover';
import { ComingSoonBoxedComponent } from './coming-soon-boxed';
import { ComingSoonCoverComponent } from './coming-soon-cover';
import { Error404Component } from './error404';
import { Error500Component } from './error500';
import { Error503Component } from './error503';
import { MaintenenceComponent } from './maintenence';

const routes: Routes = [
    { path: 'pages/contact-us-boxed', component: ContactUsBoxedComponent, data: { title: 'Contact Us Boxed' } },
    { path: 'pages/contact-us-cover', component: ContactUsCoverComponent, data: { title: 'Contact Us Cover' } },
    { path: 'pages/coming-soon-boxed', component: ComingSoonBoxedComponent, data: { title: 'Coming Soon Boxed' } },
    { path: 'pages/coming-soon-cover', component: ComingSoonCoverComponent, data: { title: 'Coming Soon Cover' } },
    { path: 'pages/error404', component: Error404Component, data: { title: 'Error 404' } },
    { path: 'pages/error500', component: Error500Component, data: { title: 'Error 500' } },
    { path: 'pages/error503', component: Error503Component, data: { title: 'Error 503' } },
    { path: 'pages/maintenence', component: MaintenenceComponent, data: { title: 'Maintenence' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        ContactUsBoxedComponent,
        ContactUsCoverComponent,
        ComingSoonBoxedComponent,
        ComingSoonCoverComponent,
        Error404Component,
        Error500Component,
        Error503Component,
        MaintenenceComponent,
    ],
})
export class PagesModule {}
