import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { ProductService } from 'src/app/services/product.service';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './add-category.html',
  animations: [toggleAnimation],
})
export class AddCategoryComponent {
  form!: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private toast: ToastService,
    private router: Router,
  ) {
    this.buildForm();
  }

  private buildForm() {
    this.form = this.fb.group({
      category: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { category } = this.form.value;
    this.submitting = true;
    this.productService.addCategory({ category }).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Category added successfully');
        this.form.reset();
        this.router.navigate(['/products/categories']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to add category';
        this.toast.error(msg);
      },
    });
  }
}
