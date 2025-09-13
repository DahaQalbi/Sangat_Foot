import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
  previewUrl: string | null = null;
  @ViewChild('imageInput') imageInputRef!: ElementRef<HTMLInputElement>;

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
      description: [''],
      preparation_time: [null, [Validators.required, Validators.min(1)]],
      isAvailable: [true],
      hasVariant: [false],
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
    // Use full data URL for preview
    this.previewUrl = base64;
    // Store stripped base64 in the form for backend
    this.form.patchValue({ image: this.stripDataUrlHeader(base64) });
  }

  clearImage() {
    this.form.patchValue({ image: '' });
    this.form.get('image')?.markAsPristine();
    this.previewUrl = null;
    if (this.imageInputRef && this.imageInputRef.nativeElement) {
      this.imageInputRef.nativeElement.value = '';
    }
  }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  private stripDataUrlHeader(dataUrl: string): string {
    if (!dataUrl) return dataUrl;
    // If it's already raw base64 (no comma), return as-is
    const idx = dataUrl.indexOf(',');
    return idx >= 0 ? dataUrl.substring(idx + 1) : dataUrl;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = { ...this.form.value };
    // Ensure image is pure base64 without header
    payload.image = this.stripDataUrlHeader(payload.image);
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
