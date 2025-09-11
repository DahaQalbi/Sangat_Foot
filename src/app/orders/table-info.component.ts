import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrderService } from 'src/app/services/order.service';
import { ProductService } from 'src/app/services/product.service';
import { environment } from 'src/environments/environment';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbService } from 'src/app/services/idb.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-table-info',
  template: `
    <div class="panel max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-4" [formGroup]="form">
        <div class="flex gap-3">
          <label class="inline-flex items-center gap-2 p-2 rounded border" [class.border-primary]="form.value.delivery_type==='delivery'">
            <input type="radio" class="form-radio" name="delivery_type" value="delivery" formControlName="delivery_type" (change)="onRecalc()" />
            <span>Delivery</span>
          </label>
          <label class="inline-flex items-center gap-2 p-2 rounded border" [class.border-primary]="form.value.delivery_type==='dine-in'">
            <input type="radio" class="form-radio" name="delivery_type" value="dine-in" formControlName="delivery_type" (change)="onRecalc()" />
            <span>Dine-in</span>
          </label>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-outline-primary" (click)="openAddProducts()">Add Products</button>
          <div class="text-sm font-semibold">Add Note</div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium">Table No</label>
            <input type="text" class="form-input w-full" formControlName="tableNo" placeholder="Enter table no" />
          </div>
          <div *ngIf="form.value.delivery_type==='delivery'">
            <label class="mb-1 block text-sm font-medium">Delivery Fee</label>
            <input type="number" class="form-input w-full" formControlName="delivery_fee" (input)="onRecalc()" placeholder="0" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4" *ngIf="form.value.delivery_type==='delivery'">
          <div class="md:col-span-3">
            <label class="mb-1 block text-sm font-medium">Address</label>
            <input type="text" class="form-input w-full" formControlName="address" placeholder="Delivery address" />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <h5 class="text-lg font-extrabold text-red-600">Order #{{orderId}}</h5>
            <button type="button" class="inline-flex items-center gap-2 px-3 py-1.5 rounded border" (click)="toggleDiscount()">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6"/></svg>
              Add Discount
            </button>
          </div>

          <div class="overflow-x-auto rounded border">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-3 py-2 text-left">Item Name</th>
                  <th class="px-3 py-2 text-center">Qty</th>
                  <th class="px-3 py-2 text-right">Amount</th>
                  <th class="px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody formArrayName="orderDetails">
                <tr *ngFor="let it of orderDetails.controls; let i=index" [formGroupName]="i" class="border-t">
                  <td class="px-3 py-2">
                    <div class="font-semibold">{{ it.value.name }}</div>
                    <div class="text-xs text-gray-500">+ Add Note</div>
                    <input type="text" formControlName="note" class="form-input w-full mt-1" placeholder="Add note" (input)="onRecalc()" />
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex items-center justify-center gap-2">
                      <button type="button" class="btn btn-sm" (click)="decQty(i)">-</button>
                      <input type="number" formControlName="qty" class="form-input w-16 text-center" (input)="onRecalc()" />
                      <button type="button" class="btn btn-sm" (click)="incQty(i)">+</button>
                    </div>
                  </td>
                  <td class="px-3 py-2 text-right">{{ (it.value.qty || 0) * (it.value.sale || 0) | number:'1.2-2' }}</td>
                  <td class="px-3 py-2 text-center">
                    <button type="button" class="text-red-600 hover:underline" (click)="removeRow(i)">Remove</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-3">
            <div *ngIf="showDiscount">
              <label class="mb-1 block text-sm font-medium">Discount</label>
              <input type="number" class="form-input w-full" formControlName="discount" (input)="onRecalc()" placeholder="0" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium">SGST (%)</label>
              <input type="number" class="form-input w-full" formControlName="sgst" (input)="onRecalc()" placeholder="0" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium">CGST (%)</label>
              <input type="number" class="form-input w-full" formControlName="cgst" (input)="onRecalc()" placeholder="0" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium">Add Note</label>
              <textarea class="form-textarea w-full" rows="2" formControlName="note" placeholder="Please make it less spicy"></textarea>
            </div>
          </div>
          <div class="rounded border p-4 bg-gray-50">
            <div class="flex justify-between text-sm mb-1"><span>Item(s)</span><span>{{ totalQty }}</span></div>
            <div class="flex justify-between text-sm mb-1"><span>Sub Total</span><span>{{ sale | number:'1.2-2' }}</span></div>
            <div class="flex justify-between text-sm mb-1"><span>Delivery Fee</span><span>{{ form.value.delivery_fee || 0 | number:'1.2-2' }}</span></div>
            <div class="flex justify-between text-sm mb-1"><span>SGST ({{form.value.sgst||0}}%)</span><span>{{ sgstAmount | number:'1.2-2' }}</span></div>
            <div class="flex justify-between text-sm mb-3"><span>CGST ({{form.value.cgst||0}}%)</span><span>{{ cgstAmount | number:'1.2-2' }}</span></div>
            <div class="flex justify-between text-base font-bold"><span>Total</span><span>{{ net | number:'1.2-2' }}</span></div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="submit" class="btn btn-primary" [disabled]="submitting || form.invalid">Save</button>
          <a routerLink="/orders/add" class="btn btn-outline-primary">Back</a>
        </div>
      </form>

      <!-- Add Products Sidebar -->
      <div *ngIf="addProductsOpen" class="fixed inset-0 overflow-hidden" style="z-index: 1000;">
        <div class="absolute inset-0 bg-black/50" (click)="closeAddProducts()"></div>
        <div class="absolute right-0 top-0 h-full w-full sm:w-[720px] bg-white dark:bg-[#0e1726] shadow-2xl will-change-transform"
             [style.transition]="'transform 300ms ease-in-out'"
             [style.transform]="addProductsOpen ? 'translateX(0)' : 'translateX(100%)'">
          <div class="p-5 h-full flex flex-col">
            <div class="mb-3 flex items-center justify-between">
              <div class="font-extrabold text-gray-800 dark:text-gray-100">Add Products</div>
              <button type="button" class="text-gray-500 hover:text-gray-800" (click)="closeAddProducts()">✕</button>
            </div>

            <div class="mb-3 flex items-center gap-2">
              <div class="relative w-full">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/></svg>
                </span>
                <input [(ngModel)]="productSearch" [ngModelOptions]="{standalone:true}" type="text" class="form-input w-full pl-9" placeholder="Search products" />
              </div>
            </div>

            <div class="flex-1 overflow-auto rounded border p-2">
              <div *ngIf="loadingProducts" class="p-3 text-sm">Loading...</div>
              <div *ngIf="productsError" class="p-3 text-sm text-red-600">{{ productsError }}</div>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div *ngFor="let p of filteredProductsForPicker" class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-[#0e1726]">
                  <div class="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                    <img [src]="imgUrl + (p.image || '')" alt="{{p.name}}" class="h-full w-full object-cover" />
                    <button type="button" (click)="togglePick(p)"
                            class="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border text-white shadow"
                            [ngClass]="isPicked(p) ? 'bg-red-600 border-red-600' : 'bg-gray-700/70 border-white/30'">
                      <svg *ngIf="isPicked(p)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                      <svg *ngIf="!isPicked(p)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                  <div class="p-3">
                    <div class="truncate font-semibold text-gray-800 dark:text-gray-100">{{ p.name }}</div>
                    <div class="mt-1 text-primary font-bold">{{ priceOfProduct(p) | currency:'USD':'symbol':'1.0-2' }}</div>
                    <div class="mt-2" *ngIf="isPicked(p)">
                      <div class="flex items-center justify-center gap-2">
                        <button type="button" class="grid h-6 w-6 place-items-center rounded border" (click)="decPick(p)">-</button>
                        <span class="text-sm">{{ pickedQty(p) }}</span>
                        <button type="button" class="grid h-6 w-6 place-items-center rounded border" (click)="incPick(p)">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-end gap-2">
              <button type="button" class="btn btn-outline-primary" (click)="closeAddProducts()">Cancel</button>
              <button type="button" class="btn btn-primary" (click)="confirmAddProducts()">Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TableInfoComponent implements OnInit {
  @Input() orderIdOverride: number | null = null;
  @Input() summaryOverride: { items: any[]; totalsale: number; totalcost: number } | null = null;
  @Input() dealIdOverride: number | null = null;
  form!: FormGroup;
  loading = true;
  submitting = false;
  orderId!: number;
  draftOrder: any = null;
  summary: { items: any[]; totalsale: number; totalcost: number } | null = null;
  dealId: number | null = null;
  showDiscount = false;

  // computed
  sale = 0;
  cost = 0;
  net = 0;
  totalQty = 0;
  sgstAmount = 0;
  cgstAmount = 0;

  // Add Products sidebar state
  addProductsOpen = false;
  products: any[] = [];
  imgUrl: string = environment.imgUrl;
  productSearch = '';
  loadingProducts = false;
  productsError: string | null = null;
  picked: Map<string | number, { product: any; qty: number }> = new Map();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private idb: IdbService,
    private toast: ToastService,
    private orderService: OrderService,
    private productService: ProductService,
  ) {}

  async ngOnInit() {
    this.form = this.fb.group({
      id: [null],
      tableNo: ['', [Validators.required]],
      orderType: ['table', [Validators.required]],
      discount: [0],
      cost: [0],
      sale: [0],
      net: [0],
      status: ['pending'],
      deal_id: [null],
      userId: [null],
      delivery_fee: [0],
      note: [''],
      delivery_type: ['dine-in'],
      address: [''],
      sgst: [0],
      cgst: [0],
      orderDetails: this.fb.array([]),
    });

    // Keep orderType in sync with delivery_type radio
    const delCtrl = this.form.get('delivery_type');
    delCtrl?.valueChanges.subscribe((val: string) => {
      const mapped = val === 'delivery' ? 'delivery' : 'table';
      this.form.patchValue({ orderType: mapped }, { emitEvent: false });
      const addrCtrl = this.form.get('address');
      const feeCtrl = this.form.get('delivery_fee');
      if (val === 'delivery') {
        addrCtrl?.addValidators(Validators.required);
      } else {
        addrCtrl?.clearValidators();
        addrCtrl?.setValue('', { emitEvent: false });
        feeCtrl?.setValue(0, { emitEvent: false });
      }
      addrCtrl?.updateValueAndValidity({ emitEvent: false });
      this.onRecalc();
    });
    // Initialize mapping and validators once
    this.form.patchValue({ orderType: this.form.value.delivery_type === 'delivery' ? 'delivery' : 'table' }, { emitEvent: false });
    {
      const val = this.form.value.delivery_type;
      const addrCtrl = this.form.get('address');
      const feeCtrl = this.form.get('delivery_fee');
      if (val === 'delivery') {
        addrCtrl?.addValidators(Validators.required);
      } else {
        addrCtrl?.clearValidators();
        feeCtrl?.setValue(0, { emitEvent: false });
      }
      addrCtrl?.updateValueAndValidity({ emitEvent: false });
    }

    // If embedded with overrides, initialize directly and skip router handling
    if (this.orderIdOverride != null && this.summaryOverride) {
      this.orderId = Number(this.orderIdOverride);
      this.summary = this.summaryOverride;
      this.dealId = this.dealIdOverride ?? null;
      this.form.patchValue({ id: this.orderId, deal_id: this.dealId ?? null });
      this.hydrateDetailsFromSummary();
      this.onRecalc();
      this.loading = false;
      return;
    }

    this.route.queryParamMap.subscribe(async (params) => {
      const idParam = params.get('id');
      if (!idParam) {
        this.toast.error('Missing order reference');
        this.router.navigate(['/orders/add']);
        return;
      }
      this.orderId = Number(idParam);
      // capture navigation state (from previous page)
      this.draftOrder = (history.state && (history.state as any).orderDraft) || null;
      this.summary = (history.state && (history.state as any).summary) || null;
      this.dealId = (history.state && (history.state as any).dealId) ?? null;
      // If summary missing (e.g., refresh), derive from IDB draft
      if (!this.summary) {
        try {
          const all = await this.idb.getAll<any>('orders');
          const order = all.find((o: any) => String(o.id) === String(this.orderId));
          if (order) {
            this.summary = this.buildSummary(order);
          }
        } catch {}
      }
      // eslint-disable-next-line no-console
      console.log('Order summary (nav/state or derived):', this.summary);
      // seed form id and details if available
      this.form.patchValue({ id: this.orderId, deal_id: this.dealId ?? null });
      this.hydrateDetailsFromSummary();
      this.onRecalc();
      this.loading = false;
    });

  }

  get orderDetails() {
    return this.form.get('orderDetails') as any;
  }

  private hydrateDetailsFromSummary() {
    const arr = this.orderDetails;
    arr.clear();
    const items = this.summary?.items || [];
    items.forEach((it: any, idx: number) => {
      arr.push(
        this.fb.group({
          id: [idx + 1],
          product_id: [it.productId],
          name: [it.name],
          size: [it.selectedSize?.type || ''],
          qty: [Number(it.qty) || 1],
          cost: [Number(it.selectedSize?.cost) || 0],
          sale: [Number(it.selectedSize?.sale) || 0],
          note: [''],
        })
      );
    });
  }

  incQty(i: number) {
    const g = this.orderDetails.at(i);
    g.patchValue({ qty: Number(g.value.qty || 0) + 1 });
    this.onRecalc();
  }
  decQty(i: number) {
    const g = this.orderDetails.at(i);
    const v = Math.max(1, Number(g.value.qty || 0) - 1);
    g.patchValue({ qty: v });
    this.onRecalc();
  }
  removeRow(i: number) {
    this.orderDetails.removeAt(i);
    this.onRecalc();
  }

  onRecalc() {
    const details = this.orderDetails?.value || [];
    this.totalQty = details.reduce((a: number, r: any) => a + (Number(r.qty) || 0), 0);
    this.sale = details.reduce((a: number, r: any) => a + (Number(r.sale) || 0) * (Number(r.qty) || 0), 0);
    this.cost = details.reduce((a: number, r: any) => a + (Number(r.cost) || 0) * (Number(r.qty) || 0), 0);
    const discount = Number(this.form.value.discount || 0);
    const delivery = Number(this.form.value.delivery_fee || 0);
    const sgstPct = Number(this.form.value.sgst || 0);
    const cgstPct = Number(this.form.value.cgst || 0);
    this.sgstAmount = +(this.sale * sgstPct / 100).toFixed(2);
    this.cgstAmount = +(this.sale * cgstPct / 100).toFixed(2);
    this.net = +(this.sale - discount + delivery + this.sgstAmount + this.cgstAmount).toFixed(2);
    this.form.patchValue({ sale: this.sale, cost: this.cost, net: this.net }, { emitEvent: false });
  }

  toggleDiscount() {
    this.showDiscount = !this.showDiscount;
  }

  // ----- Add Products Sidebar -----
  openAddProducts() {
    // eslint-disable-next-line no-console
    console.log('[TableInfoComponent] openAddProducts click');
    this.addProductsOpen = true;
    if (!this.products.length) this.fetchProductsForPicker();
  }
  closeAddProducts() {
    // eslint-disable-next-line no-console
    console.log('[TableInfoComponent] closeAddProducts click');
    this.addProductsOpen = false;
  }

  private fetchProductsForPicker() {
    this.loadingProducts = true;
    this.productsError = null;
    this.productService.getAllProducts().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.products || []);
        this.products = data || [];
        this.loadingProducts = false;
      },
      error: () => {
        this.loadingProducts = false;
        this.productsError = 'Failed to load products';
      },
    });
  }

  get filteredProductsForPicker(): any[] {
    const term = (this.productSearch || '').toLowerCase().trim();
    if (!term) return this.products || [];
    return (this.products || []).filter((p) => (p?.name || '').toString().toLowerCase().includes(term));
  }

  isPicked(p: any): boolean {
    const base = p?.productId ?? p?.id;
    return this.picked.has(base);
  }
  pickedQty(p: any): number {
    const base = p?.productId ?? p?.id;
    return this.picked.get(base)?.qty || 0;
  }
  togglePick(p: any): void {
    const base = p?.productId ?? p?.id;
    if (this.picked.has(base)) this.picked.delete(base); else this.picked.set(base, { product: p, qty: 1 });
  }
  incPick(p: any): void {
    const base = p?.productId ?? p?.id;
    const row = this.picked.get(base); if (row) row.qty += 1;
  }
  decPick(p: any): void {
    const base = p?.productId ?? p?.id;
    const row = this.picked.get(base); if (!row) return; row.qty = Math.max(1, row.qty - 1);
  }
  priceOfProduct(p: any): number {
    const first = Array.isArray(p?.sizeType) ? p.sizeType[0] : null;
    const val = p?.price ?? first?.sale ?? first?.price ?? 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }
  confirmAddProducts(): void {
    if (!this.picked.size) { this.toast.error('Please select at least one product'); return; }
    for (const { product, qty } of Array.from(this.picked.values())) {
      this.orderDetails.push(this.fb.group({
        id: [Date.now()],
        product_id: [product?.productId ?? product?.id],
        name: [product?.name || ''],
        size: [''],
        qty: [qty],
        cost: [0],
        sale: [this.priceOfProduct(product)],
        note: [''],
      }));
    }
    this.picked.clear();
    this.onRecalc();
    this.closeAddProducts();
  }


  private buildSummary(order: any): { items: any[]; totalsale: number; totalcost: number } {
    const items = (order?.items || []).map((it: any) => {
      const p = it.product || {};
      const sel = p.selectedSize || {};
      const first = Array.isArray(p.sizeType) && p.sizeType.length ? p.sizeType[0] : {};
      const selectedSize = {
        type: sel.type ?? first.type ?? 'Default',
        sale: Number(sel.sale ?? first.sale ?? p.price ?? it.price ?? 0) || 0,
        cost: Number(sel.cost ?? first.cost ?? 0) || 0,
      };
      const category = (p.category && (p.category.name || p.category)) || p.category_id || '';
      return {
        qty: it.qty,
        productId: it.productId,
        name: it.name,
        category,
        selectedSize,
      };
    });
    const totalsale = items.reduce((a: number, r: any) => a + (r.selectedSize.sale * r.qty), 0);
    const totalcost = items.reduce((a: number, r: any) => a + (r.selectedSize.cost * r.qty), 0);
    return { items, totalsale, totalcost };
  }

  private async playOrderBell() {
    // Try to play an mp3 from assets first
    const src = 'assets/sounds/order-placed.mp3';
    try {
      const audio = new Audio(src);
      audio.volume = 0.7;
      await audio.play();
      return;
    } catch {
      // Fallback to Web Audio API chime if asset not found or autoplay blocked
    }
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // no-op
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    try {
      const all = await this.idb.getAll<any>('orders');
      const idx = all.findIndex((o) => String(o.id) === String(this.orderId));
      if (idx === -1) {
        this.toast.error('Order not found');
        this.router.navigate(['/orders/add']);
        return;
      }
      const v = this.form.value;
      const payload = {
        id: this.orderId,
        tableNo: v.tableNo,
        orderType: v.orderType,
        discount: Number(v.discount) || 0,
        cost: Number(this.cost) || 0,
        sale: Number(this.sale) || 0,
        net: Number(this.net) || 0,
        status: v.status || 'pending',
        deal_id: this.dealId ?? null,
        userId: v.userId ?? null,
        delivery_fee: Number(v.delivery_fee) || 0,
        note: v.note || '',
        delivery_type: v.delivery_type,
        address: v.address || '',
        sgst: Number(v.sgst) || 0,
        cgst: Number(v.cgst) || 0,
        orderDetails: (this.orderDetails.value || []).map((r: any, i: number) => ({
          id: r.id || i + 1,
          product_id: r.product_id,
          size: r.size,
          cost: Number(r.cost) || 0,
          sale: Number(r.sale) || 0,
          note: r.note || '',
        })),
      };
      // Call API to create order
      let apiRes: any = null;
      try {
        apiRes = await firstValueFrom(this.orderService.addOrder(payload));
        this.toast.success('Order Placed');
        this.playOrderBell();
      } catch (e:any) {
        this.toast.error(e?.error?.message || 'Failed to post order');
      }

      // Persist locally as well
      const updated = {
        ...all[idx],
        ...payload,
        serverId: apiRes?.data?.id ?? apiRes?.orderId ?? apiRes?.id ?? all[idx]?.serverId,
        updated_at: new Date().toISOString(),
      };
      all[idx] = updated;
      await this.idb.replaceAll('orders', all);
      this.toast.success('Order Placed');
      // Ensure bell even if API failed but local save succeeded
      this.playOrderBell();
      this.router.navigate(['/orders/list']);
    } catch (e) {
      this.toast.error('Failed to save table info');
    } finally {
      this.submitting = false;
    }
  }
}
