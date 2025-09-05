import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from 'src/app/services/product.service';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './add-product.html',
})
export class AddProductComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  loadingCategories = true;
  categories: any[] = [];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.fetchCategories();
    // Initialize with one size row by default
    this.addSizeType();
  }

  private buildForm() {
    this.form = this.fb.group({
      category_id: [null, Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      image: ['', Validators.required], // will store base64
      sizeType: this.fb.array([] as FormGroup[]),
    });
  }

  get sizeType(): FormArray<FormGroup> {
    return this.form.get('sizeType') as FormArray<FormGroup>;
  }

  addSizeType() {
    const group = this.fb.group({
      type: ['', Validators.required],
      cost: ['', [Validators.required]],
      sale: ['', [Validators.required]],
    });
    this.sizeType.push(group);
  }

  removeSizeType(index: number) {
    this.sizeType.removeAt(index);
  }

  fetchCategories() {
    this.loadingCategories = true;
    this.productService.getAllCategories().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.categories || []);
        this.categories = data;
        this.loadingCategories = false;
      },
      error: (err: any) => {
        this.loadingCategories = false;
        this.toast.error(err?.error?.message || 'Failed to load categories');
      },
    });
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    const base64 = await this.toBase64(file);
    this.form.patchValue({ image: base64 });
  }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value;
    this.submitting = true;
    this.productService.addProduct(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Product added successfully');
        this.router.navigate(['/products/categories']);
      },
      error: (err: any) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to add product';
        this.toast.error(msg);
      },
    });
  }
}
