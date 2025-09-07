import { Component, OnInit } from '@angular/core';
import { ProductService } from 'src/app/services/product.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  templateUrl: './categories-list.html',
})
export class CategoriesListComponent implements OnInit {
  loading = true;
  error: string | null = null;
  categories: Array<{ id?: string; name?: string } & any> = [];
  deletingId: string | number | null = null;

  constructor(private productService: ProductService, private router: Router, private toast: ToastService) {}

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
    const toDelete: string | number = id as string | number;
    Swal.fire({
      title: 'Delete category?',
      text: `Are you sure you want to delete ${item?.name || 'this category'}? This action cannot be undone.`,
      icon: undefined,
      iconHtml:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
      background: '#ffffff',
      color: '#111827',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      customClass: {
        popup: 'rounded-lg shadow-xl',
        icon: '!text-red-600',
        confirmButton: 'swal2-confirm !bg-red-600 !text-white !uppercase !font-extrabold !px-4 !py-2.5 !rounded-md hover:!bg-red-700',
        cancelButton: 'swal2-cancel !bg-white !text-gray-700 !font-semibold !px-4 !py-2.5 !rounded-md !border !border-gray-300 hover:!bg-gray-100',
        title: 'font-extrabold text-red-600',
      },
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.deletingId = toDelete;
      this.productService.deleteCategory(toDelete).subscribe({
        next: () => {
          this.deletingId = null;
          this.toast?.success?.('Category deleted successfully');
          this.fetch();
        },
        error: (err) => {
          this.deletingId = null;
          this.error = err?.error?.message || 'Failed to delete category';
          this.toast?.error?.(this.error || 'Failed to delete category');
        },
      });
    });
  }
}
