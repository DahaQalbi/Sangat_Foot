import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';

import { TabsComponent } from './tabs';
import { AccordionsComponent } from './accordions';
import { ModalsComponent } from './modals';
import { CardsComponent } from './cards';
import { CarouselComponent } from './carousel';
import { CountdownComponent } from './countdown';
import { CounterComponent } from './counter';
import { SweetalertComponent } from './sweetalert';
import { TimelineComponent } from './timeline';
import { NotificationsComponent } from './notifications';
import { MediaObjectComponent } from './media-object';
import { ListGroupComponent } from './list-group';
import { PricingTableComponent } from './pricing-table';
import { LightboxComponent } from './lightbox';

const routes: Routes = [
    { path: 'components/tabs', component: TabsComponent, data: { title: 'Tabs' } },
    { path: 'components/accordions', component: AccordionsComponent, data: { title: 'Accordions' } },
    { path: 'components/modals', component: ModalsComponent, data: { title: 'Modals' } },
    { path: 'components/cards', component: CardsComponent, data: { title: 'Cards' } },
    { path: 'components/carousel', component: CarouselComponent, data: { title: 'Carousel' } },
    { path: 'components/countdown', component: CountdownComponent, data: { title: 'Countdown' } },
    { path: 'components/counter', component: CounterComponent, data: { title: 'Counter' } },
    { path: 'components/sweetalert', component: SweetalertComponent, data: { title: 'Sweetalert' } },
    { path: 'components/timeline', component: TimelineComponent, data: { title: 'Timeline' } },
    { path: 'components/notifications', component: NotificationsComponent, data: { title: 'Notifications' } },
    { path: 'components/media-object', component: MediaObjectComponent, data: { title: 'Media Object' } },
    { path: 'components/list-group', component: ListGroupComponent, data: { title: 'List Group' } },
    { path: 'components/pricing-table', component: PricingTableComponent, data: { title: 'Pricing Table' } },
    { path: 'components/lightbox', component: LightboxComponent, data: { title: 'Lightbox' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        TabsComponent,
        AccordionsComponent,
        ModalsComponent,
        CardsComponent,
        CarouselComponent,
        CountdownComponent,
        CounterComponent,
        SweetalertComponent,
        TimelineComponent,
        NotificationsComponent,
        MediaObjectComponent,
        ListGroupComponent,
        PricingTableComponent,
        LightboxComponent,
    ],
    providers: [],
})
export class ComponentsModule {}
