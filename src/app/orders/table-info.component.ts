import { Component, OnInit, OnChanges, Input, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrderService } from 'src/app/services/order.service';
import { ProductService } from 'src/app/services/product.service';
import { environment } from 'src/environments/environment';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbService } from 'src/app/services/idb.service';
import { ToastService } from 'src/app/services/toast.service';
import { StaffService } from 'src/app/services/staff.service';
import { Role } from 'src/app/enums/role.enum';

@Component({
  selector: 'app-table-info',
  templateUrl: './table-info.component.html',
})
export class TableInfoComponent implements OnInit, OnChanges {
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
  // Toggle to show/hide taxes and include/exclude them from totals
  showTaxes = false;

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
  @ViewChild('orderNote') orderNote!: ElementRef<HTMLTextAreaElement>;
  showNoteModal = false;
  noteDraft = '';
  deletingIndex: number | null = null;
  // Riders list
  riders: any[] = [];
  ridersLoading = false;
  ridersError: string | null = null;
  // Update mode flag
  isUpdateMode = false;
  // Role-based restriction: waiter can only do dine-in
  isWaiter = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private idb: IdbService,
    private toast: ToastService,
    private orderService: OrderService,
    private productService: ProductService,
    private staffService: StaffService,
  ) {}
public ordertkrid:any;
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
      rider_id: [null],
      sgst: [0],
      cgst: [0],
      orderDetails: this.fb.array([]),
    });

    // Determine current user role from localStorage and set waiter flag
    try {
      const raw = localStorage.getItem('auth');
      if (raw) {
        const u = JSON.parse(raw);
        const roleStr = (u?.role || u?.user?.role || '').toString().toLowerCase();
        this.isWaiter = roleStr.includes('waiter');
      }
    } catch {}

    // Keep orderType in sync with delivery_type radio
    const delCtrl = this.form.get('delivery_type');
    delCtrl?.valueChanges.subscribe((val: string) => {
      // Enforce dine-in for waiter
      if (this.isWaiter && val === 'delivery') {
        delCtrl.setValue('dine-in', { emitEvent: false });
        val = 'dine-in';
      }
      const mapped = val === 'delivery' ? 'delivery' : 'table';
      this.form.patchValue({ orderType: mapped }, { emitEvent: false });
      const addrCtrl = this.form.get('address');
      const feeCtrl = this.form.get('delivery_fee');
      const riderCtrl = this.form.get('rider_id');
      if (val === 'delivery') {
        addrCtrl?.addValidators(Validators.required);
        riderCtrl?.addValidators(Validators.required);
        riderCtrl?.updateValueAndValidity({ emitEvent: false });
        // Fetch riders if not already loaded
        if (!this.riders || !this.riders.length) this.fetchRiders();
      } else {
        addrCtrl?.clearValidators();
        addrCtrl?.setValue('', { emitEvent: false });
        feeCtrl?.setValue(0, { emitEvent: false });
        riderCtrl?.clearValidators();
        riderCtrl?.setValue(null, { emitEvent: false });
        riderCtrl?.updateValueAndValidity({ emitEvent: false });
      }
      addrCtrl?.updateValueAndValidity({ emitEvent: false });
      this.onRecalc();
    });
    // Initialize mapping and validators once
    if (this.isWaiter) {
      this.form.patchValue({ delivery_type: 'dine-in', orderType: 'table' }, { emitEvent: false });
    } else {
      this.form.patchValue({ orderType: this.form.value.delivery_type === 'delivery' ? 'delivery' : 'table' }, { emitEvent: false });
    }
    {
      const val = this.form.value.delivery_type;
      const addrCtrl = this.form.get('address');
      const feeCtrl = this.form.get('delivery_fee');
      const riderCtrl = this.form.get('rider_id');
      if (!this.isWaiter && val === 'delivery') {
        addrCtrl?.addValidators(Validators.required);
        riderCtrl?.addValidators(Validators.required);
        // prime riders list
        this.fetchRiders();
      } else {
        addrCtrl?.clearValidators();
        feeCtrl?.setValue(0, { emitEvent: false });
        riderCtrl?.clearValidators();
      }
      addrCtrl?.updateValueAndValidity({ emitEvent: false });
      riderCtrl?.updateValueAndValidity({ emitEvent: false });
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
      this.isUpdateMode = !!(history.state && (history.state as any).isUpdate);
      const prefill = (history.state && (history.state as any).prefill) || null;
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
      if (prefill && typeof prefill === 'object') {
        // Patch top-level fields (table no, delivery fields, taxes, etc.)
        this.form.patchValue({
          tableNo: prefill.tableNo ?? this.form.value.tableNo,
          orderType: prefill.orderType ?? this.form.value.orderType,
          delivery_type: prefill.delivery_type ?? this.form.value.delivery_type,
          delivery_fee: prefill.delivery_fee ?? this.form.value.delivery_fee,
          address: prefill.address ?? this.form.value.address,
          discount: prefill.discount ?? this.form.value.discount,
          sgst: prefill.sgst ?? this.form.value.sgst,
          cgst: prefill.cgst ?? this.form.value.cgst,
          note: prefill.note ?? this.form.value.note,
        }, { emitEvent: false });
        // If delivery, ensure riders list available and validators applied
        if (String(prefill.delivery_type || '').toLowerCase() === 'delivery') {
          if (!this.riders.length) this.fetchRiders();
        }
      }
      this.hydrateDetailsFromSummary();
      this.onRecalc();
      this.loading = false;
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes || !this.form) return;
    if (changes['summaryOverride'] && this.summaryOverride) {
      this.summary = this.summaryOverride;
      if (this.orderIdOverride != null) this.orderId = Number(this.orderIdOverride);
      if (this.dealIdOverride != null) this.dealId = Number(this.dealIdOverride);
      this.form.patchValue({ id: this.orderId, deal_id: this.dealId ?? null }, { emitEvent: false });
      this.hydrateDetailsFromSummary();
      this.onRecalc();
      this.loading = false;
    }
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
    if (!confirm('Are you sure you want to remove this item?')) return;
    const row = this.orderDetails.at(i)?.value;
    const productId = row?.product_id;
    if (!productId) {
      // If we don't have a product id, just remove locally
      this.orderDetails.removeAt(i);
      this.onRecalc();
      return;
    }
    try {
      this.deletingIndex = i;
      this.orderService.deleteOrderItem(productId).subscribe({
        next: () => {
          this.orderDetails.removeAt(i);
          this.onRecalc();
          this.toast.success('Item removed');
          this.deletingIndex = null;
        },
        error: () => {
          this.toast.error('Failed to remove item');
          this.deletingIndex = null;
        },
      });
    } catch {
      this.toast.error('Failed to remove item');
      this.deletingIndex = null;
    }
  }

  onRecalc() {
    const details = this.orderDetails?.value || [];
    this.totalQty = details.reduce((a: number, r: any) => a + (Number(r.qty) || 0), 0);
    this.sale = details.reduce((a: number, r: any) => a + (Number(r.sale) || 0) * (Number(r.qty) || 0), 0);
    this.cost = details.reduce((a: number, r: any) => a + (Number(r.cost) || 0) * (Number(r.qty) || 0), 0);
    const discount = Number(this.form.value.discount || 0);
    const delivery = Number(this.form.value.delivery_fee || 0);
    const sgstPct = this.showTaxes ? Number(this.form.value.sgst || 0) : 0;
    const cgstPct = this.showTaxes ? Number(this.form.value.cgst || 0) : 0;
    this.sgstAmount = +(this.sale * sgstPct / 100).toFixed(2);
    this.cgstAmount = +(this.sale * cgstPct / 100).toFixed(2);
    this.net = +(this.sale - discount + delivery + this.sgstAmount + this.cgstAmount).toFixed(2);
    this.form.patchValue({ sale: this.sale, cost: this.cost, net: this.net }, { emitEvent: false });
  }

  toggleDiscount() {
    this.showDiscount = !this.showDiscount;
  }

  // Focus helper for the top-level order note (triggered by the note icon above the table)
  focusOrderNote(): void {
    try {
      const el = this.orderNote?.nativeElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    } catch {}
  }

  // ----- Note Modal -----
  openNoteModal(): void {
    this.noteDraft = this.form?.value?.note || '';
    this.showNoteModal = true;
  }
  closeNoteModal(): void {
    this.showNoteModal = false;
  }
  saveNoteModal(): void {
    const text = (this.noteDraft || '').trim();
    this.form.patchValue({ note: text });
    this.showNoteModal = false;
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

  private fetchRiders(): void {
    this.ridersLoading = true;
    this.ridersError = null;
    this.staffService.getManagers().subscribe({
      next: (list: any[]) => {
        const items = Array.isArray(list) ? list : [];
        this.riders = items.filter((x: any) => {
          const role = (x?.role || '').toString().toLowerCase();
          return role === String(Role.Rider) || role.includes('rider');
        });
        this.ridersLoading = false;
      },
      error: () => {
        this.ridersLoading = false;
        this.ridersError = 'Failed to load riders';
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
      this.addProductFromPicker(product, qty);
    }
    this.picked.clear();
    this.onRecalc();
    this.closeAddProducts();
  }

  // Add directly from picker (+ icon or confirm). If exists with same product_id and size, increment qty
  addProductFromPicker(product: any, qty: number = 1): void {
    try {
      const pid = product?.productId ?? product?.id;
      const name = product?.name || '';
      const sizes = Array.isArray(product?.sizeType) ? product.sizeType : [];
      const first = sizes[0] || {};
      const sizeType = String(first?.type || 'Default');
      const sale = Number(first?.sale ?? first?.price ?? product?.price ?? 0) || 0;
      const cost = Number(first?.cost ?? 0) || 0;
      // find existing row
      const idx = this.orderDetails.controls.findIndex((g: any) => String(g.value.product_id) === String(pid) && String(g.value.size || 'Default') === sizeType);
      if (idx >= 0) {
        const g = this.orderDetails.at(idx);
        const cur = Number(g.value.qty) || 0;
        g.patchValue({ qty: cur + Number(qty || 1) });
      } else {
        this.orderDetails.push(this.fb.group({
          id: [Date.now()],
          product_id: [pid],
          name: [name],
          size: [sizeType],
          qty: [Number(qty || 1)],
          cost: [cost],
          sale: [sale],
          preparation_time: [Number((product?.preparation_time ?? product?.preparationTime ?? product?.prep_time) || 0)],
          note: [''],
        }));
      }
      this.onRecalc();
      this.toast.success('Item added');
    } catch {}
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
        // Attach orderTakerId only when creating a new order (number if possible, otherwise string)
        if (!this.isUpdateMode) {
          const raw = localStorage.getItem('auth');
          if (raw) {
            const u = JSON.parse(raw);
            const candidate: any =u.id;
            this.ordertkrid=candidate;
          } 
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
        // include optional order taker id to satisfy type checking when assigned later
        orderTakerId: this.ordertkrid,
        delivery_fee: Number(v.delivery_fee) || 0,
        note: v.note || '',
        delivery_type: v.delivery_type,
        address: v.address || '',
        rider_id: v.rider_id ?? null,
        sgst: Number(v.sgst) || 0,
        cgst: Number(v.cgst) || 0,
        orderDetails: (this.orderDetails.value || []).map((r: any, i: number) => ({
          id: r.id,
          product_id: r.product_id,
          size: r.size,
          quantity: Number(r.qty) || 0,
          cost: Number(r.cost) || 0,
          sale: Number(r.sale) || 0,
          preparation_time: Number(r.preparation_time) || 0,
          note: r.note || '',
        })),
      };
    
      // If offline, store locally and mark for sync
      if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
        const updated = {
          ...all[idx],
          ...payload,
          status: 'pending_sync',
          updated_at: new Date().toISOString(),
          offline: true,
        };
        all[idx] = updated;
        await this.idb.replaceAll('orders', all);
        this.toast.success('Saved offline. Will sync when back online.');
        // Signal new order for header bell dot (only for creation)
        if (!this.isUpdateMode) {
          try { localStorage.setItem('hasNewOrder', '1'); } catch {}
        }
        await this.playOrderBell();
        this.router.navigate(['/orders/list']);
        return;
      }

      // Call API to create/update order (online path)
      let apiRes: any = null;
      try {
        if (this.isUpdateMode) {
          apiRes = await firstValueFrom(this.orderService.updateOrder(payload));
          this.toast.success('Order Updated');
        } else {
          apiRes = await firstValueFrom(this.orderService.addOrder(payload));
          this.toast.success('Order Placed');
          if(this.isWaiter){
            this.router.navigate(['/orders/add']);
          }
          // Signal new order for header bell dot
          try { localStorage.setItem('hasNewOrder', '1'); } catch {}
        }
        await this.playOrderBell();
      } catch (e:any) {
        // If API fails, fallback to offline storage
        const updatedOffline = {
          ...all[idx],
          ...payload,
          status: 'pending_sync',
          updated_at: new Date().toISOString(),
          offline: true,
        };
        all[idx] = updatedOffline;
        await this.idb.replaceAll('orders', all);
        this.toast.success('Saved offline. Will sync when back online.');
        // Signal new order for header bell dot (only for creation)
        if (!this.isUpdateMode) {
          try { localStorage.setItem('hasNewOrder', '1'); } catch {}
        }
        await this.playOrderBell();
        this.router.navigate(['/orders/list']);
        return;
      }

      // Persist locally with server id
      const updated = {
        ...all[idx],
        ...payload,
        serverId: apiRes?.data?.id ?? apiRes?.orderId ?? apiRes?.id ?? all[idx]?.serverId,
        updated_at: new Date().toISOString(),
        offline: false,
      };
      all[idx] = updated;
      await this.idb.replaceAll('orders', all);
      this.router.navigate(['/orders/list']);
    } catch (e) {
      this.toast.error('Failed to save table info');
    } finally {
      this.submitting = false;
    }
  }
}
