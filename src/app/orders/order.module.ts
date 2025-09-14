import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from 'src/shared.module';
import { ProductModule } from '../products/product.module';
import { AddOrderComponent } from './add-order.component';
import { OrdersListComponent } from './orders-list.component';
import { TableInfoComponent } from './table-info.component';
import { RoleGuard } from 'src/app/guards/role.guard';
import { Role } from 'src/app/enums/role.enum';
import { CompletedOrdersComponent } from './completed-orders.component';
import { PaidOrdersComponent } from './paid-orders.component';
const routes: Routes = [
  { path: '', redirectTo: 'add', pathMatch: 'full' },
  { path: 'add', component: AddOrderComponent, canActivate: [RoleGuard], data: { title: 'Add Order', roles: [Role.Waiter, Role.Manager, Role.Admin] } },
  { path: 'list', component: OrdersListComponent, canActivate: [RoleGuard], data: { title: 'All Orders', roles: [Role.Cook, Role.Manager, Role.Admin] } },
  { path: 'completed', component: CompletedOrdersComponent, canActivate: [RoleGuard], data: { title: 'Completed Orders', roles: [Role.Manager, Role.Admin] } },
  { path: 'paid', component: PaidOrdersComponent, canActivate: [RoleGuard], data: { title: 'Paid Orders', roles: [Role.Manager, Role.Admin] } },
  { path: 'table', component: TableInfoComponent, canActivate: [RoleGuard], data: { title: 'Table Details', roles: [Role.Waiter, Role.Manager, Role.Admin] } },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule, FormsModule, ReactiveFormsModule, SharedModule.forRoot(), ProductModule],
  declarations: [AddOrderComponent, OrdersListComponent, TableInfoComponent, CompletedOrdersComponent, PaidOrdersComponent],
  exports: [RouterModule],
})
export class OrderModule {}
