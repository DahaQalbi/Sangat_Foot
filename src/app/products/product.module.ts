import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from 'src/shared.module';
import { AddCategoryComponent } from './add-category';
import { CategoriesListComponent } from './categories-list';
import { AddProductComponent } from './add-product';
import { SizeTypeRowComponent } from './size-type-row';
import { AllProductsComponent } from './all-products';
import { AddDealComponent } from './add-deal';
import { AllDealsComponent } from './all-deals';
import { RoleGuard } from 'src/app/guards/role.guard';
import { Role } from 'src/app/enums/role.enum';
const routes: Routes = [
  { path: '', redirectTo: 'all-deals', pathMatch: 'full' },
  { path: 'categories', component: CategoriesListComponent, canActivate: [RoleGuard], data: { title: 'Categories', roles: [Role.Admin] } },
  { path: 'add-category', component: AddCategoryComponent, canActivate: [RoleGuard], data: { title: 'Add Category', roles: [Role.Admin] } },
  { path: 'add-product', component: AddProductComponent, canActivate: [RoleGuard], data: { title: 'Add Product', roles: [Role.Admin] } },
  { path: 'all-products', component: AllProductsComponent, canActivate: [RoleGuard], data: { title: 'All Products', roles: [Role.Admin] } },
  { path: 'add-deal', component: AddDealComponent, canActivate: [RoleGuard], data: { title: 'Add Deal', roles: [Role.Admin] } },
  { path: 'all-deals', component: AllDealsComponent, canActivate: [RoleGuard], data: { title: 'All Deals', roles: [Role.Admin] } },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule, FormsModule, ReactiveFormsModule, SharedModule.forRoot()],
  declarations: [AddCategoryComponent, CategoriesListComponent, AddProductComponent, SizeTypeRowComponent, AllProductsComponent, AddDealComponent, AllDealsComponent],
  exports: [SizeTypeRowComponent],
})
export class ProductModule {}
