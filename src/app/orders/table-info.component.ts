import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrderService } from 'src/app/services/order.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbService } from 'src/app/services/idb.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-table-info',
  template: `
    <div class="panel max-w-xl mx-auto">
      <h5 class="mb-4 text-lg font-extrabold text-red-600">Order Details</h5>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium">Table No</label>
          <input type="text" class="form-input w-full" formControlName="tableNo" placeholder="Enter table no" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium">Discount</label>
          <input type="number" class="form-input w-full" formControlName="discount" placeholder="0" />
        </div>

        <div class="flex items-center gap-2">
          <button type="submit" class="btn btn-primary" [disabled]="submitting || form.invalid">Save</button>
          <a routerLink="/orders/add" class="btn btn-outline-primary">Back</a>
        </div>
      </form>
    </div>

    <div class="p-4 text-sm text-gray-600">Summary has been logged to the browser console.</div>
  `,
})
export class TableInfoComponent implements OnInit {
  form!: FormGroup;
  loading = true;
  submitting = false;
  orderId!: number;
  draftOrder: any = null;
  summary: { items: any[]; totalsale: number; totalcost: number } | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private idb: IdbService,
    private toast: ToastService,
    private orderService: OrderService,
  ) {}

  async ngOnInit() {
    this.form = this.fb.group({
      tableNo: ['', [Validators.required]],
      discount: [null],
    });

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
      this.loading = false;
    });
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
    const data={
        tableNo: this.form.value.tableNo,
      discount: this.form.value.discount,
      orderType:'table',
      cost:this.summary?.totalcost || 0,
      sale:this.summary?.totalsale || 0,
      items:this.summary?.items || [],
      status:'pending',
      created_at:new Date().toISOString(),
    }
    try {
      const all = await this.idb.getAll<any>('orders');
      const idx = all.findIndex((o) => String(o.id) === String(this.orderId));
      if (idx === -1) {
        this.toast.error('Order not found');
        this.router.navigate(['/orders/add']);
        return;
      }
      const v = this.form.value;
      const discount = Number(v.discount) || 0;
      const cost = Number(this.summary?.totalcost || 0);
      const sale = Number(this.summary?.totalsale || 0);
      const orderDetails = (this.summary?.items || []).map((it: any) => ({
        product_id: it.productId,
        size: it.selectedSize?.type,
        cost: Number(it.selectedSize?.cost) || 0,
        sale: Number(it.selectedSize?.sale) || 0,
      }));
      const payload = {
        tableNo: v.tableNo,
        orderType: 'dine-in',
        discount,
        cost,
        sale,
        net: Number((sale - discount).toFixed(2)),
        status: 'pending',
        deal_id: null,
        orderDetails,
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
