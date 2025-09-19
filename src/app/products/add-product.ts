import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { environment } from 'src/environments/environment';
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
  galleryPreviews: string[] = [];
  @ViewChild('imageInput') imageInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('descEditor') descEditor!: ElementRef<HTMLDivElement>;
  @ViewChild('quillEditor') quillEditorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('quillToolbar') quillToolbarRef!: ElementRef<HTMLDivElement>;
  private quill: any;
  // edit mode
  isUpdateMode = false;
  editingId: string | number | null = null;
  // hold original category info to resolve after categories load
  originalCategoryIdOrValue: any = null;
  originalCategoryName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.fetchCategories();
    // Ensure at least one size row initially
    if (this.sizeType.length === 0) this.addSizeType();
    // Ensure hasVariant reflects current sizeType length on init
    this.updateHasVariantFromSizeType();
    // React to hasVariant toggle: when enabled ensure at least one size row; when disabled clear rows
    const hv = this.form.get('hasVariant');
    hv?.valueChanges.subscribe((val: boolean) => {
      if (val) {
        if (this.sizeType.length === 0) this.addSizeType();
      } else {
        // keep exactly one size row when variants are disabled
        while (this.sizeType.length > 1) this.sizeType.removeAt(0);
      }
    });

    // Detect navigation state for edit mode (from All Products -> onEdit)
    try {
      const st: any = history.state || {};
      const product = st?.product;
      this.isUpdateMode = !!st?.isUpdate && !!product;
      if (this.isUpdateMode) {
        // store id for update payload
        this.editingId = product?.id ?? product?.productId ?? null;
        // keep original category to match against loaded list later
        this.originalCategoryIdOrValue = product?.category_id ?? product?.category?.id ?? product?.category;
        this.originalCategoryName = (product?.category?.name ?? product?.category ?? '').toString();
        // prefill basic fields
        this.form.patchValue({
          category_id: this.originalCategoryIdOrValue,
          name: product?.name || '',
          image: product?.image || '',
          description: product?.description || '',
          prepration_time: Number(product?.prepration_time ?? product?.preparation_time ?? 0) || null,
          isAvailable: String(product?.isAvailable ?? '').toString() === '1' ? true : !!product?.isAvailable,
          // initial guess; will be corrected after sizeType array is populated below
          hasVariant: Array.isArray(product?.sizeType) && product.sizeType.length > 1,
        });
        // preview existing main image
        if (product?.image) {
          this.previewUrl = (typeof product.image === 'string') ? (product.image.startsWith('http') ? product.image : (environment?.imgUrl ? environment.imgUrl + product.image : product.image)) : null;
        }
        // prefill gallery previews from paths
        const gal = Array.isArray(product?.gallery) ? product.gallery : [];
        this.galleryPreviews = gal.map((g: any) => {
          const path = (g?.image ?? g) as string;
          return (typeof path === 'string') ? ((environment?.imgUrl ? environment.imgUrl : '') + path) : '';
        }).filter(Boolean);
        // also set gallery form controls as objects so backend can keep them if unchanged
        const galleryFA = this.gallery;
        while (galleryFA.length) galleryFA.removeAt(0);
        for (const g of gal) {
          const path = (g?.image ?? g) as string;
          galleryFA.push(this.fb.group({ image: [path] }));
        }
        // prefill sizeType
        while (this.sizeType.length) this.sizeType.removeAt(0);
        if (Array.isArray(product?.sizeType) && product.sizeType.length) {
          for (const s of product.sizeType) {
            this.sizeType.push(this.fb.group({
              type: [s?.type || '', Validators.required],
              cost: [s?.cost ?? '', [Validators.required]],
              sale: [s?.sale ?? s?.price ?? '', [Validators.required]],
            }));
          }
        } else {
          // keep one default row
          this.addSizeType();
        }
        // After populating sizeType, ensure hasVariant matches (> 1 rows)
        this.updateHasVariantFromSizeType();
      }
    } catch {}

    // Initialize Quill after view is ready (use microtask to ensure template references exist)
    Promise.resolve().then(() => {
      try {
        const QuillGlobal: any = (window as any).Quill;
        if (!QuillGlobal || !this.quillEditorRef) return;
        this.quill = new QuillGlobal(this.quillEditorRef.nativeElement, {
          theme: 'snow',
          placeholder: 'Short description of the product',
          modules: {
            toolbar: this.quillToolbarRef?.nativeElement || true,
          },
        });
        // Seed initial value
        const initial = this.form.value.description || '';
        if (initial) {
          this.quill.root.innerHTML = initial;
        }
        // On change, sync to form
        this.quill.on('text-change', () => {
          const html: string = this.quill.root.innerHTML;
          this.form.patchValue({ description: html });
        });
      } catch {}
    });
  }

  private resolveCategorySelection(): void {
    if (!this.isUpdateMode || !this.categories || !this.categories.length) return;
    const ctrl = this.form.get('category_id');
    if (!ctrl) return;
    const wantIdOrValue = this.originalCategoryIdOrValue;
    const wantName = (this.originalCategoryName || '').toLowerCase().trim();
    let matched: any = null;
    for (const c of this.categories) {
      const value = (c?.id ?? c?._id ?? c?.categoryId ?? c?.value ?? c);
      const label = (c?.name ?? c?.category ?? c?.title ?? c ?? '').toString();
      if (wantIdOrValue != null && String(value) === String(wantIdOrValue)) { matched = value; break; }
      if (wantName && label && label.toLowerCase().trim() === wantName) { matched = value; break; }
    }
    if (matched != null) {
      ctrl.setValue(matched, { emitEvent: false });
    }
  }

  private buildForm() {
    this.form = this.fb.group({
      category_id: [null, Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      image: ['', Validators.required], // will store base64
      description: [''],
      prepration_time: [null, [Validators.required, Validators.min(1)]],
      isAvailable: [true],
      hasVariant: [false],
      // gallery should be an array of objects like: [{ image: '<base64>' }]
      gallery: this.fb.array([] as FormGroup[]),
      sizeType: this.fb.array([] as FormGroup[]),
    });
  }

  get sizeType(): FormArray<FormGroup> {
    return this.form.get('sizeType') as FormArray<FormGroup>;
  }

  get hasVariant(): boolean {
    return !!this.form?.get('hasVariant')?.value;
  }

  get gallery(): FormArray<FormGroup> {
    return this.form.get('gallery') as FormArray<FormGroup>;
  }

  addSizeType() {
    const group = this.fb.group({
      type: ['', Validators.required],
      cost: ['', [Validators.required]],
      sale: ['', [Validators.required]],
    });
    this.sizeType.push(group);
    // Update hasVariant when size rows increase
    this.updateHasVariantFromSizeType();
  }

  removeSizeType(index: number) {
    // Always enforce at least one size row present
    if (this.sizeType.length <= 1) {
      this.toast.error('At least one size is required');
      return;
    }
    this.sizeType.removeAt(index);
    // Update hasVariant when size rows decrease
    this.updateHasVariantFromSizeType();
  }

  private updateHasVariantFromSizeType(): void {
    const hvCtrl = this.form?.get('hasVariant');
    if (!hvCtrl) return;
    const want = this.sizeType.length > 1;
    hvCtrl.setValue(want, { emitEvent: false });
  }

  fetchCategories() {
    this.loadingCategories = true;
    this.productService.getAllCategories().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.categories || []);
        this.categories = data;
        this.loadingCategories = false;
        // ensure category select reflects the product's category in edit mode
        this.resolveCategorySelection();
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

  async onGalleryChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;

    const encoded = await Promise.all(files.map(f => this.toBase64(f)));
    for (const dataUrl of encoded) {
      this.galleryPreviews.push(dataUrl);
      this.gallery.push(this.fb.group({ image: [this.stripDataUrlHeader(dataUrl)] }));
    }
    // Reset file input so the same files can be selected again if needed
    if (this.galleryInputRef?.nativeElement) {
      this.galleryInputRef.nativeElement.value = '';
    }
  }

  removeGalleryImage(index: number) {
    if (index < 0 || index >= this.gallery.length) return;
    this.gallery.removeAt(index);
    this.galleryPreviews.splice(index, 1);
  }

  clearGallery() {
    while (this.gallery.length) this.gallery.removeAt(0);
    this.galleryPreviews = [];
    if (this.galleryInputRef?.nativeElement) {
      this.galleryInputRef.nativeElement.value = '';
    }
  }

  clearImage() {
    this.form.patchValue({ image: '' });
    this.form.get('image')?.markAsPristine();
    this.previewUrl = null;
    if (this.imageInputRef && this.imageInputRef.nativeElement) {
      this.imageInputRef.nativeElement.value = '';
    }
  }

  // ----- WYSIWYG description helpers -----
  exec(cmd: string) {
    try {
      this.descEditor?.nativeElement?.focus();
      document.execCommand(cmd, false);
      // Sync content back to form
      this.onDescInput();
    } catch {}
  }
  setLink() {
    try {
      const url = prompt('Enter URL');
      if (!url) return;
      this.descEditor?.nativeElement?.focus();
      document.execCommand('createLink', false, url);
      this.onDescInput();
    } catch {}
  }
  onDescInput(_e?: Event) {
    const html = this.descEditor?.nativeElement?.innerHTML || '';
    this.form.patchValue({ description: html });
  }

  // ---- Quick add to current order (navigates with prefillItems) ----
  addToOrder(): void {
    try {
      const name = (this.form.value?.name || '').toString();
      const sizes: any[] = (this.sizeType?.value as any[]) || [];
      const first = sizes[0] || {};
      const selectedSize = {
        type: String(first?.type || 'Default'),
        sale: Number(first?.sale || 0) || 0,
        cost: Number(first?.cost || 0) || 0,
      };
      const productId = this.editingId ?? `temp_${Date.now()}`;
      this.router.navigate(['/orders/add'], {
        state: {
          prefillItems: [
            { productId, name, qty: 1, selectedSize },
          ],
        },
      });
    } catch {}
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
    // Ensure we have at least one size row regardless of hasVariant
    if (this.sizeType.length === 0) {
      this.toast.error('Please add at least one size');
      return;
    }
    const payload = { ...this.form.value } as any;
    // normalize category_id from possible shapes (id, object, string)
    const cat = payload.category_id;
    if (cat && typeof cat === 'object') {
      payload.category_id = cat.id ?? cat._id ?? cat.categoryId ?? cat.value ?? cat.name ?? cat;
    }
    // include id for update
    if (this.isUpdateMode && this.editingId != null) {
      payload.id = this.editingId;
    }
    // Ensure image is pure base64 without header
    payload.image = this.stripDataUrlHeader(payload.image);
    // Normalize gallery to [{ image: '<base64 or path>' }, ...] and ensure base64 is stripped (keep paths as-is)
    const galArr = Array.isArray(payload.gallery) ? payload.gallery : [];
    payload.gallery = galArr.map((g: any) => {
      const val = (g && typeof g === 'object') ? (g.image ?? g.path ?? g.url ?? '') : g;
      const strVal = String(val || '');
      // If it's a data URL, strip header; if it's raw base64 keep as-is; if it's a path keep path
      const normalized = this.stripDataUrlHeader(strVal);
      return { image: normalized };
    });
    this.submitting = true;
    const req$ = this.isUpdateMode ? this.productService.updateProduct(payload) : this.productService.addProduct(payload);
    req$.subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success(this.isUpdateMode ? 'Product updated successfully' : 'Product added successfully');
        this.router.navigate(['/products/all-products']);
      },
      error: (err: any) => {
        this.submitting = false;
        const msg = err?.error?.message || (this.isUpdateMode ? 'Failed to update product' : 'Failed to add product');
        this.toast.error(msg);
      },
    });
  }
}
