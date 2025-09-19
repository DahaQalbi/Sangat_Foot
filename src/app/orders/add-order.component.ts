import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { IdbService } from 'src/app/services/idb.service';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/services/toast.service';
import { ProductService } from 'src/app/services/product.service';
import { OrderService } from 'src/app/services/order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-add-order',
  templateUrl: './add-order.component.html',
  animations: [toggleAnimation],
})
export class AddOrderComponent {
  form!: FormGroup;
  submitting = false;
  loading = false;
  error: string | null = null;

  products: any[] = [];
  // Deals support
  deals: any[] = [];
  dealsLoading = false;
  search = '';
  categories: string[] = [];
  selectedCategory = 'All';
  categoryCounts: Record<string, number> = {};
  imgUrl: string = environment.imgUrl;
  fallbackImg: string = '/assets/images/product-camera.jpg';

  // selected items: key by productId or id
  selected: Map<string | number, { product: any; qty: number }> = new Map();
  // Embed TableInfo in sidebar
  embedTableInfo = true;
  embeddedOrderId: number = Date.now();

  // Modal state for size selection
  sizeModalOpen = false;
  activeProduct: any = null;
  sizeForm!: FormGroup;
  sizeChips: Array<{ type: string; cost: number; sale: number }> = [];
  chipTargetIndex = 0;
  chipSelections: Map<string, { sale: number; qty: number }> = new Map();
  // custom manual entry
  customType = '';
  customCost: number | null = null;
  customSale: number | null = null;
  // Guard to prevent accidental double-add from rapid click/bubble
  private selectClickGuard = false;

  // Memoized summary passed to child TableInfo to avoid rebinding every tick
  selectedSummaryCache: { items: any[]; totalsale: number; totalcost: number } = { items: [], totalsale: 0, totalcost: 0 };

  // ----- Order Side Modal (Table Info) -----
  orderSidebarOpen = false;
  orderForm!: FormGroup;
  showDiscount = false;
  orderId: number = 0;
  // totals
  sale = 0;
  sgstAmount = 0;
  cgstAmount = 0;
  net = 0;
  totalQty = 0;

  constructor(
    private fb: FormBuilder,
    private idb: IdbService,
    private router: Router,
    private toast: ToastService,
    private productService: ProductService,
    private orderService: OrderService,
  ) {
    this.form = this.fb.group({
      customerName: [''],
      phone: [''],
      notes: [''],
    });
    // form for size modal
    this.sizeForm = this.fb.group({
      sizes: this.fb.array([] as FormGroup[]),
    });
    this.initLoad();
  }

  // Normalize a gallery entry to an image path string
  gallerySrc(g: unknown): string {
    try {
      const obj: any = g as any;
      const path: string = (obj?.image ?? obj?.src ?? obj?.path ?? obj?.url ?? obj) as string;
      return this.imgUrl + String(path || '');
    } catch {
      return this.fallbackImg;
    }
  }

  // Improve ngFor performance to avoid unnecessary image rerenders
  trackByProductId(index: number, p: any): string | number {
    return p?.productId ?? p?.id ?? index;
  }

  // Fallback image handler
  onImgError(evt: Event): void {
    const img = evt.target as HTMLImageElement;
    if (!img) return;
    // Prevent infinite loop if fallback also 404s
    if (img.dataset['fallbackApplied'] === '1') return;
    img.dataset['fallbackApplied'] = '1';
    img.src = this.fallbackImg;
    img.loading = 'lazy';
    img.decoding = 'async' as any;
  }

  // Load products from cache, then API in background
  private async initLoad() {
    await this.loadFromCache();
    this.fetchProducts();
  }

  private async loadFromCache() {
    try {
      const cached = await this.idb.getAll<any>('products');
      if (Array.isArray(cached) && cached.length) {
        this.products = cached;
        this.computeCategories();
      }
    } catch (e) {
      // ignore
    }
  }

  private fetchProducts() {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!this.products.length) this.loading = true;
    if (!online) {
      // Offline: rely on cache from loadFromCache(); do not call API
      this.loading = false;
      if (!this.products.length) this.error = 'Offline: showing cached products';
      return;
    }
    this.productService.getAllProducts().subscribe({
      next: async (res) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.products || []);
        this.products = data || [];
        this.computeCategories();
        // After products load, also fetch deals (needs products to compute sizes/prices)
        this.fetchDeals();
        try {
          // Save fresh copy to IndexedDB for offline use
          await this.idb.replaceAll('products', this.normalizedProductsForCache());
        } catch {}
        this.loading = false;
        // Ensure summary is in sync on fresh load (in case something was preselected)
        this.recomputeSelectedSummary();
      },
      error: async () => {
        // If API fails while online, fallback to cache
        try {
          const cached = await this.idb.getAll<any>('products');
          this.products = cached || [];
          this.computeCategories();
          // Merge any prefillItems (e.g., from Add Product page) into left-side selection so Table Info reflects them
          try {
            const prefillItems = (history.state && (history.state as any).prefillItems) || null;
            const items = Array.isArray(prefillItems) ? prefillItems : [];
            for (const it of items) {
              const p: any = {
                id: it?.productId ?? it?.id,
                productId: it?.productId ?? it?.id,
                name: it?.name,
                price: it?.selectedSize?.sale,
                sizeType: [{ type: it?.selectedSize?.type, sale: it?.selectedSize?.sale, cost: it?.selectedSize?.cost }],
              };
              const sel = {
                type: String(it?.selectedSize?.type || 'Default'),
                sale: Number(it?.selectedSize?.sale || 0) || 0,
                cost: Number(it?.selectedSize?.cost || 0) || 0,
              };
              this.addOrIncSelection(p, sel as any, Number(it?.qty || 1));
            }
          } catch {}
          this.onRecalc();
          this.recomputeSelectedSummary();
        } catch {}
        this.loading = false;
        this.error = 'Failed to load products';
        // Even if products API fails, attempt deals (may still work)
        this.fetchDeals();
      },
    });
  }

  private fetchDeals(): void {
    this.dealsLoading = true;
    this.error = null;
    this.orderService.getAllDeals().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.deals || []);
        this.deals = data || [];
        this.dealsLoading = false;
      },
      error: () => {
        this.dealsLoading = false;
      },
    });
  }

  private findProduct(productId: any): any | null {
    const pid = String(productId);
    return (this.products || []).find((p: any) => String(p?.productId ?? p?.id) === pid) || null;
  }

  private buildSummaryFromDeal(deal: any): { items: any[] } {
    const items = (deal?.items || deal?.dealItem || []).map((it: any) => {
      const p = this.findProduct(it.product_id) || {};
      const sizes = Array.isArray(p?.sizeType) ? p.sizeType : [];
      const match = sizes.find((s: any) => String(s?.type) === String(it?.sizeType)) || {};
      const selectedSize = {
        type: String(it?.sizeType || match?.type || 'Default'),
        sale: Number(match?.sale ?? 0) || 0,
        cost: Number(match?.cost ?? 0) || 0,
      };
      return {
        qty: Number(it?.quantity) || 1,
        productId: it?.product_id,
        name: p?.name || `Item #${it?.product_id}`,
        selectedSize,
        productRef: p,
      };
    });
    return { items };
  }

  addDealToSelection(deal: any) {
    const s = this.buildSummaryFromDeal(deal);
    for (const it of s.items) {
      const keyBase = it.productId ?? it.productRef?.productId ?? it.productRef?.id;
      const type = it.selectedSize?.type || 'Default';
      const key = `${keyBase}_${type}`;
      const entry = {
        ...(it.productRef || {}),
        selectedSize: { ...it.selectedSize },
      };
      if (this.selected.has(key)) {
        const prev = this.selected.get(key)!;
        prev.qty += Number(it.qty) || 0;
        this.selected.set(key, prev);
      } else {
        this.selected.set(key, { product: entry, qty: Number(it.qty) || 1 });
      }
    }
    this.recomputeSelectedSummary();
  }

  private normalizedProductsForCache(): any[] {
    return (this.products || []).map((p: any, idx: number) => {
      let productId = p?.productId ?? p?.id;
      if (productId === undefined || productId === null || productId === '') productId = `p_${Date.now()}_${idx}`;
      return { ...p, productId };
    });
  }

  private computeCategories(): void {
    const counts: Record<string, number> = {};
    for (const p of this.products || []) {
      const c = (p?.category?.name || p?.category || '').toString().trim() || 'Uncategorized';
      counts[c] = (counts[c] || 0) + 1;
    }
    const unique = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    this.categoryCounts = { All: (this.products || []).length, ...counts };
    this.categories = ['All', ...unique];
    if (!this.categories.includes(this.selectedCategory)) this.selectedCategory = 'All';
  }

  get filteredProducts(): any[] {
    const term = (this.search || '').toLowerCase().trim();
    let list = this.products || [];
    if (this.selectedCategory && this.selectedCategory !== 'All') {
      const sel = this.selectedCategory.toLowerCase();
      list = list.filter((p) => ((p?.category?.name || p?.category || '').toString().toLowerCase() === sel));
    }
    if (term) {
      list = list.filter((p) => (p?.name || '').toString().toLowerCase().includes(term));
    }
    return list;
  }

  categoryCount(c: string): number { return this.categoryCounts[c] ?? 0; }

  isSelected(p: any): boolean {
    const base = p?.productId ?? p?.id;
    // If the product has a size attached, check that exact entry
    if (p?.selectedSize) {
      const key = `${base}_${p.selectedSize.type || 'Default'}`;
      return this.selected.has(key);
    }
    // Otherwise, check if any size of this product exists in cart
    for (const k of this.selected.keys()) {
      if (String(k).startsWith(String(base) + '_') || String(k) === String(base)) return true;
    }
    return false;
  }

  toggleSelect(p: any): void {
    // Throttle to avoid duplicate adds from double events / rapid click
    if (this.selectClickGuard) return;
    this.selectClickGuard = true;
    setTimeout(() => { this.selectClickGuard = false; }, 250);
    try {
      const base = p?.productId ?? p?.id;
      const sizes = Array.isArray(p?.sizeType) ? p.sizeType : [];
      // If multiple sizes: toggle all sizes selection for this product
      if (sizes.length > 1) {
        let removedAny = false;
        for (const k of Array.from(this.selected.keys())) {
          if (String(k).startsWith(String(base) + '_') || String(k) === String(base)) {
            this.selected.delete(k);
            removedAny = true;
          }
        }
        if (removedAny) {
          this.recomputeSelectedSummary();
          return;
        }
        // Otherwise open the size chooser modal
        this.openSizeModal(p);
        return;
      }
      // Determine selected size (single size or default)
      let sel: { type: string; sale: number; cost?: number } = { type: 'Default', sale: 0 };
      if (sizes.length === 1) {
        const s = sizes[0] || {};
        sel = { type: s.type || 'Default', sale: Number(s.sale ?? s.price ?? 0) || 0, cost: Number(s.cost ?? 0) };
      } else {
        sel = { type: 'Default', sale: Number(p?.price ?? 0) || 0, cost: 0 };
      }
      const key = `${base}_${sel.type || 'Default'}`;
      if (this.selected.has(key)) {
        this.selected.delete(key);
        this.recomputeSelectedSummary();
        return;
      }
      this.addOrIncSelection(p, sel, 1);
    } catch {
      // fallback to modal if anything unexpected happens
      this.openSizeModal(p);
    }
  }

  inc(p: any): void {
    const base = p?.productId ?? p?.id;
    const key = p?.selectedSize ? `${base}_${p.selectedSize.type || 'Default'}` : String(base);
    const row = this.selected.get(key);
    if (row) { row.qty += 1; this.selected.set(key, row); }
    this.recomputeSelectedSummary();
  }

  dec(p: any): void {
    const base = p?.productId ?? p?.id;
    const key = p?.selectedSize ? `${base}_${p.selectedSize.type || 'Default'}` : String(base);
    const row = this.selected.get(key);
    if (!row) return;
    row.qty -= 1;
    if (row.qty <= 0) this.selected.delete(key);
    else this.selected.set(key, row);
    this.recomputeSelectedSummary();
  }

  // Receive qty updates from embedded TableInfo and sync to parent cart
  onChildQtyChanged(evt: { productId: any; size: string; qty: number }): void {
    try {
      const base = evt?.productId;
      const type = (evt?.size || 'Default').toString();
      const key = `${base}_${type}`;
      if (!this.selected.has(key)) return; // ignore unknown rows
      if (evt.qty <= 0) {
        this.selected.delete(key);
      } else {
        const row = this.selected.get(key)!;
        row.qty = Number(evt.qty) || 1;
        this.selected.set(key, row);
      }
      this.recomputeSelectedSummary();
    } catch {}
  }

  private addOrIncSelection(product: any, selectedSize: { type: string; sale: number; cost?: number }, qty: number) {
    const base = product?.productId ?? product?.id;
    const type = selectedSize?.type || 'Default';
    const key = `${base}_${type}`;
    const entry = { ...product, selectedSize: { ...selectedSize } };
    if (this.selected.has(key)) {
      const prev = this.selected.get(key)!;
      prev.qty += Number(qty) || 1;
      this.selected.set(key, prev);
    } else {
      this.selected.set(key, { product: entry, qty: Number(qty) || 1 });
    }
    this.recomputeSelectedSummary();
  }

  get totalItems(): number {
    let t = 0; this.selected.forEach((v) => t += v.qty); return t;
  }

  priceOf(p: any): number {
    // Try common fields: price, sale price on sizeType, etc.
    if (p?.selectedSize) {
      const val = p.selectedSize?.sale ?? p.selectedSize?.price ?? 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    }
    if (typeof p?.price === 'number') return p.price;
    const first = Array.isArray(p?.sizeType) ? p.sizeType[0] : null;
    const val = first?.sale ?? first?.price ?? 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }

  get totalPrice(): number {
    let t = 0;
    this.selected.forEach(({ product, qty }) => { t += this.priceOf(product) * qty; });
    return t;
  }

  // Build summary for embedded TableInfo component
  private recomputeSelectedSummary(): void {
    const items = Array.from(this.selected.values()).map(({ product, qty }) => {
      const p = product || {};
      const sel = p.selectedSize || {};
      const first = Array.isArray(p.sizeType) && p.sizeType.length ? p.sizeType[0] : {};
      const selectedSize = {
        type: sel.type ?? first.type ?? 'Default',
        sale: Number(sel.sale ?? first.sale ?? p.price ?? 0) || 0,
        cost: Number(sel.cost ?? first.cost ?? 0) || 0,
      };
      const category = (p.category && (p.category.name || p.category)) || p.category_id || '';
      return {
        qty,
        productId: p?.productId ?? p?.id,
        name: p?.name,
        category,
        selectedSize,
      };
    });
    const totalsale = items.reduce((a, r) => a + r.selectedSize.sale * r.qty, 0);
    const totalcost = items.reduce((a, r) => a + r.selectedSize.cost * r.qty, 0);
    this.selectedSummaryCache = { items, totalsale, totalcost };
  }

  async createOrder() {
    if (!this.selected.size) { this.toast.error('Please select at least one item'); return; }
    this.submitting = true;
    try {
      const v = this.form.value;
      const items = Array.from(this.selected.values()).map(({ product, qty }) => ({
        productId: product?.productId ?? product?.id,
        name: product?.name,
        price: this.priceOf(product),
        qty,
        product, // include full product data (including selectedSize)
      }));
      const draftId = Date.now();
      const order = {
        id: draftId,
        customerName: v.customerName,
        phone: v.phone,
        notes: v.notes,
        items,
        total: this.totalPrice,
        created_at: new Date().toISOString(),
        status: 'draft',
      };
      await this.idb.putAll('orders', [order]);

      // Build flattened summary for next page state
      const summaryItems = items.map((it) => {
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
      const totalsale = summaryItems.reduce((a, r) => a + (r.selectedSize.sale * r.qty), 0);
      const totalcost = summaryItems.reduce((a, r) => a + (r.selectedSize.cost * r.qty), 0);

      // Go to table info step with both the raw draft and flattened summary via navigation state
      this.router.navigate(['/orders/table'], {
        queryParams: { id: draftId },
        state: {
          orderDraft: order,
          summary: { items: summaryItems, totalsale, totalcost },
        },
      });
    } catch {
      this.toast.error('Failed to create order');
    } finally {
      this.submitting = false;
    }
  }

  // ------- Size Modal Logic -------
  get sizesFA(): FormArray<FormGroup> {
    return this.sizeForm.get('sizes') as FormArray<FormGroup>;
  }

  private buildSizeGroup(init: any): FormGroup {
    return this.fb.group({
      type: [init?.type || ''],
      cost: [init?.cost ?? 0],
      sale: [init?.sale ?? init?.price ?? 0],
    });
  }

  openSizeModal(p: any) {
    this.activeProduct = p;
    // reset form array
    while (this.sizesFA.length) this.sizesFA.removeAt(0);
    const src = Array.isArray(p?.sizeType) && p.sizeType.length ? p.sizeType : [];
    this.sizeChips = src.map((s: any) => ({ type: s?.type || '', cost: Number(s?.cost ?? 0) || 0, sale: Number(s?.sale ?? s?.price ?? 0) || 0 }));
    // Initialize chip selections (qty=0 for each size). If no sizes, create a default one.
    this.chipSelections.clear();
    if (this.sizeChips.length) {
      for (const c of this.sizeChips) this.chipSelections.set(c.type || 'Default', { sale: c.sale, qty: 0 });
    } else {
      const defSale = Number(p?.price ?? 0) || 0;
      this.sizeChips = [{ type: 'Default', cost: 0, sale: defSale }];
      this.chipSelections.set('Default', { sale: defSale, qty: 0 });
    }
    this.chipTargetIndex = 0;
    this.customType = '';
    this.customCost = null;
    this.customSale = null;
    // Default: show one manual input row
    this.sizesFA.push(this.buildSizeGroup({ type: '', cost: 0, sale: 0 }));
    this.sizeModalOpen = true;
  }

  closeSizeModal() { this.sizeModalOpen = false; this.activeProduct = null; }

  addSizeRow() { this.sizesFA.push(this.buildSizeGroup({ type: '', cost: 0, sale: 0 })); }
  removeSizeRow(i: number) { this.sizesFA.removeAt(i); }
  incSizeQty(i: number) {}
  decSizeQty(i: number) {}

  confirmAddFromModal() {
    const keyBase = this.activeProduct?.productId ?? this.activeProduct?.id;
    const rows = (this.sizesFA.value as any[]).filter((r) => (r?.type || '').toString().trim() && Number(r?.sale) > 0);
    if (!rows.length) { this.toast.error('Please add at least one size with price'); return; }
    for (const r of rows) {
      const type = (r.type || 'Custom').toString();
      const sale = Number(r.sale) || 0;
      const cost = Number(r.cost);
      const key = `${keyBase}_${type}`;
      const entry = { ...this.activeProduct, selectedSize: { type, sale, cost: isNaN(cost) ? undefined : cost } };
      if (this.selected.has(key)) {
        const prev = this.selected.get(key)!;
        prev.qty += 1;
        this.selected.set(key, prev);
      } else {
        this.selected.set(key, { product: entry, qty: 1 });
      }
    }
    this.closeSizeModal();
    // open order sidebar so user can finalize details
    this.openOrderSidebar();
  }

  selectChipForRow(chip: { type: string; cost: number; sale: number }) {
    // Patch selected chip into the currently active row for manual review/edits
    const i = this.chipTargetIndex || 0;
    const g = this.sizesFA.at(i);
    if (!g) return;
    g.patchValue({ type: chip.type || 'Default', cost: chip.cost ?? 0, sale: chip.sale ?? 0 });
  }

  addCustomSize() {
    const type = (this.customType || 'Custom').trim();
    const sale = Number(this.customSale);
    const cost = Number(this.customCost);
    if (!type || isNaN(sale) || sale <= 0) {
      this.toast.error('Enter valid type and price');
      return;
    }
    const keyBase = this.activeProduct?.productId ?? this.activeProduct?.id;
    const key = `${keyBase}_${type}`;
    const entry = { ...this.activeProduct, selectedSize: { type, sale, cost: isNaN(cost) ? undefined : cost } };
    if (this.selected.has(key)) {
      const prev = this.selected.get(key)!;
      prev.qty += 1;
      this.selected.set(key, prev);
    } else {
      this.selected.set(key, { product: entry, qty: 1 });
    }
    this.closeSizeModal();
    // open order sidebar so user can finalize details
    this.openOrderSidebar();
  }

  // ---------- Order Side Modal helpers ----------
  private buildOrderFormFromSelection(): void {
    const details = Array.from(this.selected.values()).map(({ product, qty }) => {
      const name = product?.name || '';
      const sale = this.priceOf(product);
      return this.fb.group({ name: [name], qty: [qty, [Validators.min(1)]], sale: [sale, [Validators.min(0)]], note: [''] });
    });
    this.orderForm = this.fb.group({
      delivery_type: ['dine-in', [Validators.required]],
      tableNo: [''],
      delivery_fee: [0],
      address: [''],
      discount: [0],
      sgst: [0],
      cgst: [0],
      note: [''],
      orderDetails: this.fb.array(details),
    });
    this.onRecalc();
  }

  get orderDetails(): FormArray<FormGroup> {
    return this.orderForm.get('orderDetails') as FormArray<FormGroup>;
  }

  openOrderSidebar(): void {
    if (!this.selected.size) { this.toast.error('Please add items first'); return; }
    this.orderId = Date.now();
    this.buildOrderFormFromSelection();
    this.orderSidebarOpen = true;
  }

  closeOrderSidebar(): void { this.orderSidebarOpen = false; }

  toggleDiscount(): void { this.showDiscount = !this.showDiscount; }

  onRecalc(): void {
    if (!this.orderForm) return;
    const v = this.orderForm.value;
    let sale = 0; let qty = 0;
    for (const g of this.orderDetails.controls) {
      const row = g.value as any;
      const q = Number(row.qty) || 0;
      const s = Number(row.sale) || 0;
      sale += q * s;
      qty += q;
    }
    this.totalQty = qty;
    this.sale = sale;
    const sgstPct = Number(v.sgst) || 0;
    const cgstPct = Number(v.cgst) || 0;
    const delivery = Number(v.delivery_fee) || 0;
    const discount = Number(v.discount) || 0;
    this.sgstAmount = (sale * sgstPct) / 100;
    this.cgstAmount = (sale * cgstPct) / 100;
    this.net = Math.max(0, sale + delivery + this.sgstAmount + this.cgstAmount - discount);
  }

  onSubmitOrder(): void {
    if (!this.orderForm || this.orderForm.invalid) return;
    const items = this.orderDetails.controls.map((g) => {
      const row = g.value as any;
      return {
        qty: Number(row.qty) || 0,
        productId: undefined,
        name: row.name,
        category: '',
        selectedSize: { type: 'Default', sale: Number(row.sale) || 0, cost: 0 },
      };
    });
    const totalsale = items.reduce((a, r) => a + r.selectedSize.sale * r.qty, 0);
    const totalcost = 0;
    this.router.navigate(['/orders/table'], {
      queryParams: { id: this.orderId },
      state: {
        orderDraft: {
          id: this.orderId,
          customerName: '',
          phone: '',
          notes: this.orderForm.value?.note || '',
          items: [],
          total: this.net,
          created_at: new Date().toISOString(),
          status: 'draft',
        },
        summary: { items, totalsale, totalcost },
      },
    });
  }

  // Row helpers for orderDetails
  incQty(i: number): void {
    const g = this.orderDetails.at(i);
    const q = Number(g.value.qty) || 0;
    g.patchValue({ qty: q + 1 });
    this.onRecalc();
  }
  decQty(i: number): void {
    const g = this.orderDetails.at(i);
    const q = Number(g.value.qty) || 0;
    g.patchValue({ qty: Math.max(1, q - 1) });
    this.onRecalc();
  }
  removeRow(i: number): void {
    this.orderDetails.removeAt(i);
    this.onRecalc();
  }
}
