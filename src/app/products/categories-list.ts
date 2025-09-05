import { Component, OnInit } from '@angular/core';
import { ProductService } from 'src/app/services/product.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './categories-list.html',
})
export class CategoriesListComponent implements OnInit {
  loading = true;
  error: string | null = null;
  categories: Array<{ id?: string; name?: string } & any> = [];
  deletingId: string | number | null = null;

  constructor(private productService: ProductService, private router: Router) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.error = null;
    this.productService.getAllCategories().subscribe({
      next: (res) => {
        // Support both array payloads or wrapped payloads
        const data = Array.isArray(res) ? res : (res?.data || res?.categories || []);
        this.categories = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load categories';
      },
    });
  }

  goToAdd() {
    this.router.navigate(['/products/add-category']);
  }

  private pickId(item: any): string | number | null {
    return item?.id ?? item?._id ?? item?.categoryId ?? item?.name ?? item?.category ?? null;
  }

  delete(item: any) {
    const id = this.pickId(item);
    if (id == null) {
      this.error = 'Cannot determine category identifier to delete.';
      return;
    }
    const confirmed = window.confirm('Are you sure you want to delete this category?');
    if (!confirmed) return;
    this.deletingId = id;
    this.productService.deleteCategory(id).subscribe({
      next: () => {
        this.deletingId = null;
        this.fetch();
      },
      error: (err) => {
        this.deletingId = null;
        this.error = err?.error?.message || 'Failed to delete category';
      },
    });
  }
}
