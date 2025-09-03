import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';

import { AlertsComponent } from './alerts';
import { AvatarComponent } from './avatar';
import { BadgesComponent } from './badges';
import { BreadcrumbsComponent } from './breadcrumbs';
import { ButtonsComponent } from './buttons';
import { ButtonsGroupComponent } from './buttons-group';
import { ColorLibraryComponent } from './color-library';
import { DropdownComponent } from './dropdown';
import { InfoboxComponent } from './infobox';
import { JumbotronComponent } from './jumbotron';
import { LoaderComponent } from './loader';
import { PaginationComponent } from './pagination';
import { PopoversComponent } from './popovers';
import { ProgressBarComponent } from './progress-bar';
import { SearchComponent } from './search';
import { TooltipsComponent } from './tooltips';
import { TreeviewComponent } from './treeview';
import { TypographyComponent } from './typography';

const routes: Routes = [
    { path: 'elements/alerts', component: AlertsComponent, data: { title: 'Alerts' } },
    { path: 'elements/avatar', component: AvatarComponent, data: { title: 'Avatar' } },
    { path: 'elements/badges', component: BadgesComponent, data: { title: 'Badges' } },
    { path: 'elements/breadcrumbs', component: BreadcrumbsComponent, data: { title: 'Breadcrumbs' } },
    { path: 'elements/buttons', component: ButtonsComponent, data: { title: 'Buttons' } },
    { path: 'elements/buttons-group', component: ButtonsGroupComponent, data: { title: 'Buttons Group' } },
    { path: 'elements/color-library', component: ColorLibraryComponent, data: { title: 'Color Library' } },
    { path: 'elements/dropdown', component: DropdownComponent, data: { title: 'Dropdown' } },
    { path: 'elements/infobox', component: InfoboxComponent, data: { title: 'Infobox' } },
    { path: 'elements/jumbotron', component: JumbotronComponent, data: { title: 'Jumbotron' } },
    { path: 'elements/loader', component: LoaderComponent, data: { title: 'Loader' } },
    { path: 'elements/pagination', component: PaginationComponent, data: { title: 'Pagination' } },
    { path: 'elements/popovers', component: PopoversComponent, data: { title: 'Popovers' } },
    { path: 'elements/progress-bar', component: ProgressBarComponent, data: { title: 'Progress Bar' } },
    { path: 'elements/search', component: SearchComponent, data: { title: 'Search' } },
    { path: 'elements/tooltips', component: TooltipsComponent, data: { title: 'Tooltips' } },
    { path: 'elements/treeview', component: TreeviewComponent, data: { title: 'Treeview' } },
    { path: 'elements/typography', component: TypographyComponent, data: { title: 'Typography' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        AlertsComponent,
        AvatarComponent,
        BadgesComponent,
        BreadcrumbsComponent,
        ButtonsComponent,
        ButtonsGroupComponent,
        ColorLibraryComponent,
        DropdownComponent,
        InfoboxComponent,
        JumbotronComponent,
        LoaderComponent,
        PaginationComponent,
        PopoversComponent,
        ProgressBarComponent,
        SearchComponent,
        TooltipsComponent,
        TreeviewComponent,
        TypographyComponent,
    ],
    providers: [],
})
export class ElementsModule {}
