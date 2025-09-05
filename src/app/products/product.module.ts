import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from 'src/shared.module';
import { AddCategoryComponent } from './add-category';
import { CategoriesListComponent } from './categories-list';
import { AddProductComponent } from './add-product';
import { SizeTypeRowComponent } from './size-type-row';

const routes: Routes = [
  { path: '', redirectTo: 'categories', pathMatch: 'full' },
  { path: 'categories', component: CategoriesListComponent, data: { title: 'Categories' } },
  { path: 'add-category', component: AddCategoryComponent, data: { title: 'Add Category' } },
  { path: 'add-product', component: AddProductComponent, data: { title: 'Add Product' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule, ReactiveFormsModule, SharedModule.forRoot()],
  declarations: [AddCategoryComponent, CategoriesListComponent, AddProductComponent, SizeTypeRowComponent],
})
export class ProductModule {}
