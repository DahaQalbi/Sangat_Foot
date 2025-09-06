import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from 'src/shared.module';
import { ProductModule } from '../products/product.module';
import { AddOrderComponent } from './add-order.component';
import { OrdersListComponent } from './orders-list.component';
import { TableInfoComponent } from './table-info.component';
const routes: Routes = [
  { path: '', redirectTo: 'add', pathMatch: 'full' },
  { path: 'add', component: AddOrderComponent, data: { title: 'Add Order' } },
  { path: 'list', component: OrdersListComponent, data: { title: 'All Orders' } },
  { path: 'table', component: TableInfoComponent, data: { title: 'Table Details' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule, FormsModule, ReactiveFormsModule, SharedModule.forRoot(), ProductModule],
  declarations: [AddOrderComponent, OrdersListComponent, TableInfoComponent],
  exports: [RouterModule],
})
export class OrderModule {}
