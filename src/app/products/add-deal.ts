import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from 'src/app/services/order.service';
import { ProductService } from 'src/app/services/product.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  template: `
    <div class="panel max-w-xl mx-auto">
      <div class="mb-5 flex items-center justify-between">
        <h5 class="text-lg font-extrabold text-red-600">Add Deal</h5>
        <a routerLink="/products/all-products" class="btn btn-outline-primary">Back</a>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">

        <div>
          <label class="mb-1 block text-sm font-medium">Deal Name</label>
          <input type="text" class="form-input w-full" formControlName="name" placeholder="Family Combo Deal" />
          <div class="mt-1 text-xs text-red-600" *ngIf="form.get('name')?.touched && form.get('name')?.invalid">Name is required</div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium">Expire At</label>
          <input type="datetime-local" class="form-input w-full" formControlName="expire_at" />
          <div class="mt-1 text-xs text-red-600" *ngIf="form.get('expire_at')?.touched && form.get('expire_at')?.invalid">Expiry is required</div>
          <p class="mt-1 text-[11px] text-gray-500">Will be sent as YYYY-MM-DD HH:mm:ss</p>
        </div>

        <div class="mt-4">
          <div class="mb-2 flex items-center justify-between">
            <h6 class="font-extrabold text-sm">Deal Items</h6>
            <button type="button" class="btn btn-outline-primary btn-sm" (click)="addItem()">+ Add Item</button>
          </div>
          <div class="space-y-3">
            <div *ngFor="let g of items.controls; let i = index" [formGroup]="g" class="grid grid-cols-12 gap-2 rounded border p-3">
              <div class="col-span-6">
                <label class="mb-1 block text-xs font-medium">Product</label>
                <select class="form-select w-full" formControlName="productId" (change)="onProductChange(i)">
                  <option [ngValue]="null" disabled>Select a product</option>
                  <option *ngFor="let p of products" [ngValue]="p.productId">{{ p.name }}</option>
                </select>
              </div>
              <div class="col-span-4">
                <label class="mb-1 block text-xs font-medium">Size Type</label>
                <select class="form-select w-full" formControlName="sizeType" [disabled]="!items.at(i).get('productId')?.value">
                  <option [ngValue]="null" disabled>Select size</option>
                  <option *ngFor="let s of sizesFor(i)" [ngValue]="s.type">{{ s.type }}</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="mb-1 block text-xs font-medium">Qty</label>
                <input type="number" min="1" class="form-input w-full" formControlName="quantity" />
              </div>
              <div class="col-span-12 flex justify-end">
                <button type="button" class="btn btn-outline-danger btn-sm" (click)="removeItem(i)" *ngIf="items.controls.length > 1">Remove</button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="submit" class="btn btn-primary" [disabled]="submitting || form.invalid">Save Deal</button>
          <button type="button" class="btn btn-outline-danger" [disabled]="submitting" (click)="form.reset({ name: '', expire_at: '' })">Clear</button>
        </div>
      </form>
    </div>
  `,
})
export class AddDealComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  products: any[] = [];

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private productService: ProductService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      expire_at: ['', [Validators.required]], // datetime-local
      items: this.fb.array([] as FormGroup[]),
    });
    this.fetchProducts();
    this.addItem();
  }

  private toSqlDateTime(dtLocal: string): string {
    // Input format from datetime-local: 'YYYY-MM-DDTHH:mm' (possibly with seconds)
    if (!dtLocal) return '';
    const [date, time] = dtLocal.split('T');
    if (!date || !time) return dtLocal.replace('T', ' ');
    const t = time.length === 5 ? `${time}:00` : time; // add seconds if missing
    return `${date} ${t}`;
  }

  get items(): FormArray<FormGroup> { return this.form.get('items') as FormArray<FormGroup>; }

  addItem() {
    const g = this.fb.group({
      productId: [null, Validators.required],
      sizeType: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
    this.items.push(g);
  }

  removeItem(index: number) {
    this.items.removeAt(index);
  }

  sizesFor(index: number): any[] {
    const pid = this.items.at(index)?.get('productId')?.value;
    const p = this.products.find((x) => String(x.productId) === String(pid));
    return p?.sizeType || [];
  }

  onProductChange(index: number) {
    // When product changes, pick the first available size automatically
    const ctrl = this.items.at(index);
    const pid = ctrl.get('productId')?.value;
    const p = this.products.find((x) => String(x.productId) === String(pid));
    const first = p?.sizeType && p.sizeType.length ? p.sizeType[0] : null;
    ctrl.get('sizeType')?.setValue(first ? first.type : null);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const dealItem = (v.items || []).map((it: any) => ({
      product_id: it.productId,
      sizeType: it.sizeType,
      quantity: Number(it.quantity) || 1,
    }));
    // Auto-compute totals from selected items
    let totalCost = 0;
    let totalSale = 0;
    for (const it of v.items || []) {
      const p = this.products.find((x) => String(x.productId) === String(it.productId));
      const s = p?.sizeType?.find((st: any) => String(st.type) === String(it.sizeType));
      const qty = Number(it.quantity) || 1;
      const cost = Number(s?.cost || 0);
      const sale = Number(s?.sale || 0);
      totalCost += cost * qty;
      totalSale += sale * qty;
    }
    const payload = {
      name: v.name,
      expire_at: this.toSqlDateTime(v.expire_at),
      cost: Number(totalCost.toFixed(2)),
      sale: Number(totalSale.toFixed(2)),
      dealItem,
    };
    // eslint-disable-next-line no-console
    console.log('Deal payload:', payload);
    this.submitting = true;
    this.orderService.addDeal(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Deal added successfully');
        this.router.navigate(['/products/all-products']);
      },
      error: (err) => {
        this.submitting = false;
        this.toast.error(err?.error?.message || 'Failed to add deal');
      },
    });
  }

  private fetchProducts() {
    this.productService.getAllProducts().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.products || []);
        // Keep full objects so sizeType is available; ensure productId is present
        this.products = (data || []).map((p: any) => ({
          ...p,
          productId: p.productId ?? p.id,
          sizeType: Array.isArray(p.sizeType) ? p.sizeType : [],
        }));
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Failed to load products');
      },
    });
  }
}
