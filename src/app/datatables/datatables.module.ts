import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';

import { BasicDatatableComponent } from './basic';
import { AdvancedDatatableComponent } from './advanced';
import { SkinDatatableComponent } from './skin';
import { OrderSortingDatatableComponent } from './order-sorting';
import { ColumnsFilterDatatableComponent } from './columns-filter';
import { MultiColumnDatatableComponent } from './multi-column';
import { MultiTablesComponent } from './multiple-tables';
import { AltPaginationDatatableComponent } from './alt-pagination';
import { CheckboxDatatableComponent } from './checkbox';
import { RangeSearchDatatableComponent } from './range-search';
import { ExportDatatableComponent } from './export';
import { StickyHeaderDatatableComponent } from './sticky-header';
import { CloneHeaderDatatableComponent } from './clone-header';
import { ColumnChooserDatatableComponent } from './column-chooser';

const routes: Routes = [
    { path: 'datatables/basic', component: BasicDatatableComponent, data: { title: 'Basic Table' } },
    { path: 'datatables/advanced', component: AdvancedDatatableComponent, data: { title: 'Advanced Table' } },
    { path: 'datatables/skin', component: SkinDatatableComponent, data: { title: 'Skin Table' } },
    {
        path: 'datatables/order-sorting',
        component: OrderSortingDatatableComponent,
        data: { title: 'Order Sorting Table' },
    },
    {
        path: 'datatables/columns-filter',
        component: ColumnsFilterDatatableComponent,
        data: { title: 'Columns Filter Table' },
    },
    {
        path: 'datatables/multi-column',
        component: MultiColumnDatatableComponent,
        data: { title: 'Multi Column Table' },
    },
    {
        path: 'datatables/multiple-tables',
        component: MultiTablesComponent,
        data: { title: 'Multiple Tables' },
    },
    {
        path: 'datatables/alt-pagination',
        component: AltPaginationDatatableComponent,
        data: { title: 'Alternative Pagination' },
    },
    {
        path: 'datatables/checkbox',
        component: CheckboxDatatableComponent,
        data: { title: 'Checkbox Table' },
    },
    {
        path: 'datatables/range-search',
        component: RangeSearchDatatableComponent,
        data: { title: 'Range Search Table' },
    },
    {
        path: 'datatables/export',
        component: ExportDatatableComponent,
        data: { title: 'Export Table' },
    },
    {
        path: 'datatables/sticky-header',
        component: StickyHeaderDatatableComponent,
        data: { title: 'Sticky Header' },
    },
    {
        path: 'datatables/clone-header',
        component: CloneHeaderDatatableComponent,
        data: { title: 'Clone Header Table' },
    },
    {
        path: 'datatables/column-chooser',
        component: ColumnChooserDatatableComponent,
        data: { title: 'Column Chooser Table' },
    },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        BasicDatatableComponent,
        AdvancedDatatableComponent,
        SkinDatatableComponent,
        OrderSortingDatatableComponent,
        ColumnsFilterDatatableComponent,
        MultiColumnDatatableComponent,
        MultiTablesComponent,
        AltPaginationDatatableComponent,
        CheckboxDatatableComponent,
        RangeSearchDatatableComponent,
        ExportDatatableComponent,
        StickyHeaderDatatableComponent,
        CloneHeaderDatatableComponent,
        ColumnChooserDatatableComponent,
    ],
    providers: [],
})
export class DatatablesModule {}
