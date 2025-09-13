import { Component, OnInit } from '@angular/core';
import { OrderService } from 'src/app/services/order.service';
import { IdbService } from 'src/app/services/idb.service';
import { OrderStatus } from './order-status.enum';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-paid-orders',
  template: `
  <div class="panel">
    <div class="mb-4 flex items-center justify-between">
      <h5 class="text-lg font-extrabold text-red-600">Paid Orders ({{ orders.length }})</h5>
      <input type="text" class="form-input h-9 w-56" [(ngModel)]="search" placeholder="Search id, customer, table, waiter, status" />
    </div>

    <!-- Type Tabs -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <button type="button"
              class="rounded-full border px-4 py-1.5 text-sm transition"
              [ngClass]="selectedTab==='all' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 dark:bg-transparent dark:text-gray-200 dark:border-white/20'"
              (click)="selectedTab='all'">All</button>
      <button type="button"
              class="rounded-full border px-4 py-1.5 text-sm transition"
              [ngClass]="selectedTab==='delivery' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 dark:bg-transparent dark:text-gray-200 dark:border-white/20'"
              (click)="selectedTab='delivery'">Delivery</button>
      <button type="button"
              class="rounded-full border px-4 py-1.5 text-sm transition"
              [ngClass]="selectedTab==='dine-in' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 dark:bg-transparent dark:text-gray-200 dark:border-white/20'"
              (click)="selectedTab='dine-in'">Dine-in</button>
    </div>

    <div *ngIf="loading" class="rounded border border-gray-200 p-4 dark:border-gray-700">Loading orders...</div>
    <div *ngIf="error" class="rounded border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-transparent">{{ error }}</div>

    <div *ngIf="!loading && !error">
      <div class="text-gray-500" *ngIf="!filtered.length">No paid orders found.</div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" *ngIf="filtered.length">
        <div *ngFor="let o of filtered" class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-[#0e1726]">
          <div class="mb-2 flex items-start justify-between">
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">{{ o.tableNo }}</span>
              <div>
                <div class="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{{ o.customer }}</div>
                <div class="text-xs text-gray-500">Order #{{ o.id }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="rounded bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-700 dark:bg-white/10 dark:text-gray-200">{{ o.orderType }}</span>
              <span class="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">Paid</span>
              <button type="button" class="rounded border border-gray-300 px-2 py-1 text-[10px] font-semibold hover:bg-gray-50" (click)="printInvoice(o)">Print PDF</button>
            </div>
          </div>
          <div class="mb-3 flex items-center justify-between text-xs text-gray-500">
            <div>Order Date: {{ o.created | date:'MMM dd, yyyy hh:mm a' }}</div>
            <div class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-emerald-500"></span> Paid</div>
          </div>
          <div class="mb-4 text-xs text-gray-600" *ngIf="o.itemsCount > 0">{{ o.itemsCount }} Item(s)</div>
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold">Bill: {{ o.total | number:'1.0-2' }}</div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span class="i-heroicons-user-circle"></span>
              <span>{{ o.waiter || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class PaidOrdersComponent implements OnInit {
  loading = false;
  error: string | null = null;
  orders: any[] = [];
  search = '';
  // order type filter tab: 'all' | 'delivery' | 'dine-in'
  selectedTab: 'all' | 'delivery' | 'dine-in' = 'all';
  readonly defaultLogo = '/assets/images/logo_Sangat.png';
  // normalize env logo to ensure leading '/'
  private normalizeLogoPath(p?: string): string {
    const val = (p || '').trim();
    if (!val) return this.defaultLogo;
    return val.startsWith('/') ? val : '/' + val;
  }
  logoSrc: string = this.normalizeLogoPath(environment.logo);
  // Optional company name from environment (not typed in env interface)
  companyName: string | undefined = (environment as any)?.companyName;

  constructor(private orderService: OrderService, private idb: IdbService) {}

  ngOnInit(): void {
    this.fetchPaid();
  }

  async fetchPaid() {
    this.loading = true;
    this.error = null;
    try {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (online) {
        this.orderService.getAllOrders().subscribe({
          next: async (res: any) => {
            const serverData: any[] = Array.isArray(res) ? res : (res?.data || res?.orders || []);
            // Merge in any local pending/offline orders to keep cache consistent
            let localAll: any[] = [];
            try { localAll = await this.idb.getAll<any>('orders'); } catch {}
            const pendingLocal = (localAll || []).filter((o: any) => o && (o.status === 'pending_sync' || o.offline === true));
            const serverIdSet = new Set((serverData || []).map((x: any) => String(x?.id ?? x?._id ?? '')));
            const merged = [...serverData, ...pendingLocal.filter((p: any) => !serverIdSet.has(String(p.id)))];

            const normalized = (merged || []).map((o: any, idx: number) => this.toCard(o, idx));
            this.orders = normalized.filter((o: any) => o.status === OrderStatus.Paid);
            this.loading = false;
            try { await this.idb.replaceAll('orders', merged); } catch {}
          },
          error: async (err: any) => {
            // Fallback to local cache
            try {
              const local = await this.idb.getAll<any>('orders');
              const normalized = (local || []).map((o: any, idx: number) => this.toCard(o, idx));
              this.orders = normalized.filter((o: any) => o.status === OrderStatus.Paid);
            } catch {}
            this.loading = false;
            this.error = err?.error?.message || 'Failed to load orders';
          },
        });
        return;
      }

      // Offline: show local cache only
      const local = await this.idb.getAll<any>('orders');
      const normalized = (local || []).map((o: any, idx: number) => this.toCard(o, idx));
      this.orders = normalized.filter((o: any) => o.status === OrderStatus.Paid);
      this.loading = false;
    } catch (e) {
      this.loading = false;
      this.error = 'Failed to load orders';
    }
  }

  get filtered(): any[] {
    // type tab first
    let list = (this.orders || []);
    if (this.selectedTab === 'delivery') list = list.filter((o: any) => o.orderType === 'delivery');
    else if (this.selectedTab === 'dine-in') list = list.filter((o: any) => o.orderType === 'dine-in');
    // then search
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
    };
  }

  private normalizeStatus(val: any): OrderStatus {
    const s = String(val || '').toLowerCase();
    if (s === 'cooking' || s === 'cook' || s === 'cokking') return OrderStatus.Cooking;
    if (s === 'completed' || s === 'complete' || s === 'done') return OrderStatus.Completed;
    if (s === 'paid' || s === 'pay' || s === 'payment') return OrderStatus.Paid;
    if (s === 'cancel' || s === 'cancell' || s === 'cancelled' || s === 'canceled') return OrderStatus.Cancel;
    return OrderStatus.Pending;
  }

  // Print a full invoice styled similar to the provided reference
  printInvoice(o: any) {
    const win = window.open('', '_blank');
    if (!win) return;
    const created = new Date(o?.created || Date.now());
    const currency = 'Rs ';
    const toMoney = (n: any) => currency + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const logoUrl = this.logoSrc.startsWith('http') ? this.logoSrc : (window.location.origin + this.logoSrc);

    // Try to derive items if present on the order object
    const rawItems: any[] = Array.isArray(o?.items)
      ? o.items
      : Array.isArray(o?.orderItems)
      ? o.orderItems
      : [];
    const items = rawItems.map((it: any, idx: number) => {
      const name = it?.name || it?.product?.name || `Item ${idx + 1}`;
      const unit = it?.price ?? it?.selectedSize?.sale ?? it?.amount ?? it?.unitPrice ?? 0;
      const qty = Number(it?.qty ?? it?.quantity ?? 1) || 1;
      const total = Number(unit) * qty;
      return { name, unit, qty, total };
    });
    if (!items.length) {
      // Fallback: single line item representing the bill
      items.push({ name: 'Order Total', unit: Number(o?.total) || 0, qty: 1, total: Number(o?.total) || 0 });
    }

    const subtotal = items.reduce((a, r) => a + r.total, 0);
    const taxRate = 0.1; // 10%
    const tax = subtotal * taxRate;
    const grand = subtotal + tax;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice #${o?.id}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: #111827; margin: 0; }
    .container { max-width: 720px; margin: 40px auto; padding: 0 24px; }
    .header { display: flex; align-items: center; justify-content: space-between; }
    .brand { text-align: center; margin: 16px auto; }
    .brand img { width: 150px; height: auto; object-fit: contain; }
    .muted { color: #6b7280; font-size: 12px; }
    h1 { font-size: 20px; margin: 8px 0; letter-spacing: 2px; }
    h2 { font-size: 12px; font-weight: 800; letter-spacing: 1px; color: #6b7280; margin: 24px 0 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .hr { border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; letter-spacing: 1px; color: #6b7280; padding: 10px 8px; border-bottom: 2px solid #e5e7eb; }
    td { font-size: 13px; color: #111827; padding: 10px 8px; border-bottom: 1px solid #f3f4f6; }
    tfoot td { border-bottom: none; font-weight: 700; }
    .right { text-align: right; }
    .totals { width: 240px; margin-left: auto; }
    .bank { margin-top: 28px; }
    .thankyou { margin-top: 40px; text-align: right; font-style: italic; font-size: 24px; color: #6b7280; }
    @media print { .container { margin: 0 auto; } }
  </style>
  <script>
    function onLoaded(){ setTimeout(()=>{ window.print(); }, 100); }
  </script>
  </head>
  <body onload="onLoaded()">
    <div class="container">
      <div class="brand">
        <img src="${logoUrl}" alt="Logo" />
        ${this.companyName ? `<div class="muted">${this.companyName}</div>` : ''}
      </div>

      <div class="grid">
        <div>
          <h2>ISSUED TO:</h2>
          <div>${o?.customer || 'Guest'}</div>
          ${o?.company ? `<div class="muted">${o.company}</div>` : ''}
          ${o?.phone ? `<div class="muted">${o.phone}</div>` : ''}
        </div>
        <div class="right">
          <h2>INVOICE NO:</h2>
          <div><strong>#${o?.id ?? ''}</strong></div>
          <div class="muted">${created.toLocaleDateString()}</div>
        </div>
      </div>

      <hr class="hr"/>

      <table>
        <thead>
          <tr>
            <th>DESCRIPTION</th>
            <th class="right">UNIT PRICE</th>
            <th class="right">QTY</th>
            <th class="right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (it) => `
            <tr>
              <td>${it.name}</td>
              <td class="right">${toMoney(it.unit)}</td>
              <td class="right">${it.qty}</td>
              <td class="right">${toMoney(it.total)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>

      <hr class="hr"/>

      <table class="totals">
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td class="right">${toMoney(subtotal)}</td>
          </tr>
          <tr>
            <td style="font-weight:800">Amount due</td>
            <td class="right" style="font-weight:800">${toMoney(grand)}</td>
          </tr>
        </tbody>
      </table>

      <div class="bank">
        <h2>BANK DETAILS</h2>
        <div>Borcelo Bank</div>
        <div class="muted">Account Name: Cashier</div>
        <div class="muted">Account No.: 0000-0000</div>
        <div class="muted">Pay by: ${new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString()}</div>
      </div>

      <div class="thankyou">thank you</div>
    </div>
  </body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
