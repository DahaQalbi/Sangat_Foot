import { Component, OnInit } from '@angular/core';
import { OrderService } from 'src/app/services/order.service';
import { ToastService } from 'src/app/services/toast.service';
import { IdbService } from 'src/app/services/idb.service';
import { OrderStatus } from './order-status.enum';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-completed-orders',
  templateUrl: './completed-orders.component.html',
})
export class CompletedOrdersComponent implements OnInit {
  loading = false;
  error: string | null = null;
  orders: any[] = [];
  private paidSet: Set<string | number> = new Set();
  // branding
  readonly defaultLogo = '/assets/images/logo.svg';
  logoSrc: string = (environment.logo && environment.logo.trim()) ? environment.logo : this.defaultLogo;
  // search
  search = '';
  // order type filter tab: 'all' | 'delivery' | 'dine-in'
  selectedTab: 'all' | 'delivery' | 'dine-in' = 'all';

  constructor(private orderService: OrderService, private toast: ToastService, private idb: IdbService) {}

  ngOnInit(): void {
    this.fetchCompleted();
  }

  async fetchCompleted() {
    this.loading = true;
    this.error = null;
    try {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (online) {
        this.orderService.getAllOrders().subscribe({
          next: async (res: any) => {
            const serverData: any[] = Array.isArray(res) ? res : (res?.data || res?.orders || []);
            // merge pending/offline local records
            let localAll: any[] = [];
            try { localAll = await this.idb.getAll<any>('orders'); } catch {}
            const pendingLocal = (localAll || []).filter((o: any) => o && (o.status === 'pending_sync' || o.offline === true));
            const serverIdSet = new Set((serverData || []).map((x: any) => String(x?.id ?? x?._id ?? '')));
            const merged = [...serverData, ...pendingLocal.filter((p: any) => !serverIdSet.has(String(p.id)))];

            const normalized = (merged || []).map((o: any, idx: number) => this.toCard(o, idx));
            this.orders = normalized.filter((o: any) => o.status === OrderStatus.Completed);
            this.loading = false;
            try { await this.idb.replaceAll('orders', merged); } catch {}
          },
          error: async (err: any) => {
            // fallback to local cache
            try {
              const local = await this.idb.getAll<any>('orders');
              const normalized = (local || []).map((o: any, idx: number) => this.toCard(o, idx));
              this.orders = normalized.filter((o: any) => o.status === OrderStatus.Completed);
            } catch {}
            this.loading = false;
            this.error = err?.error?.message || 'Failed to load orders';
          },
        });
        return;
      }

      // offline: show local cache only
      const local = await this.idb.getAll<any>('orders');
      const normalized = (local || []).map((o: any, idx: number) => this.toCard(o, idx));
      this.orders = normalized.filter((o: any) => o.status === OrderStatus.Completed);
      this.loading = false;
    } catch (e) {
      this.loading = false;
      this.error = 'Failed to load orders';
    }
  }

  get filtered(): any[] {
    // apply type tab
    let list = (this.orders || []);
    if (this.selectedTab === 'delivery') list = list.filter((o: any) => o.orderType === 'delivery');
    else if (this.selectedTab === 'dine-in') list = list.filter((o: any) => o.orderType === 'dine-in');
    // apply search
    const q = (this.search || '').toLowerCase().trim();
    if (!q) return list;
    return list.filter((o: any) => (
      String(o.id).includes(q) ||
      String(o.customer || '').toLowerCase().includes(q) ||
      String(o.tableNo || '').toLowerCase().includes(q) ||
      String(o.waiter || '').toLowerCase().includes(q) ||
      String(o.status || '').toLowerCase().includes(q)
    ));
  }

  private toCard(o: any, idx: number) {
    const created = o?.created_at || o?.createdAt || o?.orderDate || new Date().toISOString();
    const total = Number(o?.sale ?? o?.total ?? o?.totalsale ?? 0) || 0;
    const itemsCount = Array.isArray(o?.items) ? o.items.length : (Array.isArray(o?.orderDetails) ? o.orderDetails.length : (o?.items_count || 0));
    const rawType = (o?.orderType ?? o?.delivery_type ?? o?.type ?? '').toString().toLowerCase();
    const orderType = rawType === 'delivery' ? 'delivery' : 'dine-in';
    return {
      id: o?.id ?? o?._id ?? idx,
      tableNo: o?.tableNo || o?.table || o?.table_number || 'T-?',
      status: this.normalizeStatus(o?.status),
      total,
      itemsCount,
      created,
      customer: o?.customerName || o?.customer || 'Guest',
      waiter: o?.waiterName || o?.waiter || '',
      orderType,
      // include raw fields needed for printing
      orderItems: o?.orderItems || o?.items || [],
      sale: o?.sale,
      discount: o?.discount,
      delivery_fee: o?.delivery_fee,
      sgst: o?.sgst,
      cgst: o?.cgst,
      net: o?.net,
      note: o?.note,
      delivery_type: o?.delivery_type || rawType,
      address: o?.address,
    };
  }

  private normalizeStatus(val: any): OrderStatus {
    const s = String(val || '').toLowerCase();
    if (s === 'cooking' || s === 'cook' || s === 'cokking') return OrderStatus.Cooking;
    if (s === 'completed' || s === 'complete' || s === 'done') return OrderStatus.Completed;
    return OrderStatus.Pending;
  }

  isPaid(o: any): boolean {
    return this.paidSet.has(o?.id);
  }

  markPaid(o: any) {
    if (!o?.id) return;
    // Call status update API with 'paid'
    this.orderService.updateOrderStatus(o.id, 'paid').subscribe({
      next: () => {
        this.paidSet.add(o.id);
        this.toast.success('Order marked as paid');
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Failed to mark as paid');
      },
    });
  }

  printInvoice(o: any) {
    const win = window.open('', '_blank');
    if (!win) return;
    // Normalize fields from backend payload
    const createdStr = o?.create_at || o?.created_at || o?.createdAt || new Date().toISOString();
    const created = new Date(createdStr);
    const items: any[] = Array.isArray(o?.orderItems) ? o.orderItems : (Array.isArray(o?.items) ? o.items : []);
    const currency = 'Rs ';
    const toMoney = (n: any) => currency + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Build item rows: assume qty=1 if not provided; use sale as unit price if present
    const normalized = items.map((it: any) => {
      const qty = Number(it?.qty ?? 1) || 1;
      const name = it?.name || it?.product?.name || 'Item';
      const unit = Number(it?.sale ?? it?.price ?? it?.amount ?? 0) || 0;
      const total = unit * qty;
      return { qty, name, unit, total };
    });
    const itemsTotal = normalized.reduce((a, r) => a + r.total, 0);
    const subtotal = Number(o?.sale) ? Number(o.sale) : itemsTotal;
    const discountVal = Number(o?.discount) || 0;
    const delFee = Number(o?.delivery_fee) || 0;
    // Treat sgst/cgst as PERCENTAGES (e.g., 10 => 10%) as requested
    const sgstPct = Number(o?.sgst) || 0;
    const cgstPct = Number(o?.cgst) || 0;
    const sgstVal = +(subtotal * (sgstPct / 100));
    const cgstVal = +(subtotal * (cgstPct / 100));
    const computedGrand = subtotal - discountVal + delFee + sgstVal + cgstVal;
    const grand = Number(o?.net) ? Number(o.net) : computedGrand;

    const companyName = 'Sangat Fast Food';
    const address1 = (window as any)?.envAddress1 || 'Tando adam Chowk Shahdadpur';
    const address2 = (window as any)?.envAddress2 || 'Dist:Sanghar Sindh';
    const phone = (window as any)?.envPhone || 'Phone:03353878664';

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Order #${o?.id}</title>
  <style>
    @page { size: 80mm auto; margin: 8mm 6mm; }
    body { font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827; }
    .header { text-align:center; }
    .title { font-weight: 800; font-size: 18px; }
    .muted { color:#6b7280; font-size: 12px; line-height: 1.15; }
    .row { display:flex; justify-content: space-between; align-items:center; font-size: 12px; margin: 10px 0; }
    .hr { border:0; border-top:1px dashed #9ca3af; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 6px 4px; }
    th { text-align:left; border-bottom:1px solid #111827; font-weight:700; }
    td { border-bottom:1px dashed #e5e7eb; }
    .right { text-align:right; }
    .totals { width: 100%; margin-top: 6px; font-size: 12px; }
    .totals .row { margin: 4px 0; }
    .grand { font-weight: 800; font-size: 14px; }
  </style>
  <script>function onLoaded(){ setTimeout(()=>{ window.print(); }, 100); }</script>
  </head>
  <body onload="onLoaded()">
    <div class="header">
      <div class="title">${companyName}</div>
      <div class="muted">${address1}</div>
      <div class="muted">${address2}</div>
      <div class="muted">${phone}</div>
    </div>
    <div class="row">
      <div>Order #${o?.id ?? ''}</div>
      <div>${created.toLocaleString()}</div>
    </div>
    <hr class="hr"/>
    <table>
      <thead>
        <tr>
          <th style="width:40px">Qty</th>
          <th>Item Name</th>
          <th class="right" style="width:80px">Price</th>
          <th class="right" style="width:90px">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${normalized.map(r => `
          <tr>
            <td>${r.qty}</td>
            <td>${r.name}</td>
            <td class="right">${toMoney(r.unit)}</td>
            <td class="right">${toMoney(r.total)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div class="totals">
      <div class="row"><div>Sub Total:</div><div class="right">${toMoney(subtotal)}</div></div>
      <div class="row"><div>Discount:</div><div class="right">-${toMoney(discountVal)}</div></div>
      <div class="row"><div>Delivery Fee:</div><div class="right">${toMoney(delFee)}</div></div>
      <div class="row"><div>SGST (${sgstPct ? sgstPct.toFixed(2) + '%' : '0%'}):</div><div class="right">${toMoney(sgstVal)}</div></div>
      <div class="row"><div>CGST (${cgstPct ? cgstPct.toFixed(2) + '%' : '0%'}):</div><div class="right">${toMoney(cgstVal)}</div></div>
      <div class="row grand"><div>Total:</div><div class="right">${toMoney(grand)}</div></div>
    </div>
  </body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
