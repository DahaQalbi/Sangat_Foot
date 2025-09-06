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
const routes: Routes = [
  { path: '', redirectTo: 'categories', pathMatch: 'full' },
  { path: 'categories', component: CategoriesListComponent, data: { title: 'Categories' } },
  { path: 'add-category', component: AddCategoryComponent, data: { title: 'Add Category' } },
  { path: 'add-product', component: AddProductComponent, data: { title: 'Add Product' } },
  { path: 'all-products', component: AllProductsComponent, data: { title: 'All Products' } },
  { path: 'add-deal', component: AddDealComponent, data: { title: 'Add Deal' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule, FormsModule, ReactiveFormsModule, SharedModule.forRoot()],
  declarations: [AddCategoryComponent, CategoriesListComponent, AddProductComponent, SizeTypeRowComponent, AllProductsComponent, AddDealComponent],
  exports: [SizeTypeRowComponent],
})
export class ProductModule {}
