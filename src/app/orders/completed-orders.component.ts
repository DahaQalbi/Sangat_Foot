import { Component, OnInit } from '@angular/core';
import { OrderService } from 'src/app/services/order.service';
import { ToastService } from 'src/app/services/toast.service';
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

  constructor(private orderService: OrderService, private toast: ToastService) {}

  ngOnInit(): void {
    this.fetchCompleted();
  }

  fetchCompleted() {
    this.loading = true;
    this.error = null;
    this.orderService.getAllOrders().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.orders || []);
        const normalized = (data || []).map((o: any, idx: number) => this.toCard(o, idx));
        this.orders = normalized.filter((o: any) => o.status === OrderStatus.Completed);
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load orders';
      },
    });
  }

  get filtered(): any[] {
    const q = (this.search || '').toLowerCase().trim();
    if (!q) return this.orders;
    return (this.orders || []).filter((o: any) => {
      return (
        String(o.id).includes(q) ||
        String(o.customer || '').toLowerCase().includes(q) ||
        String(o.tableNo || '').toLowerCase().includes(q) ||
        String(o.waiter || '').toLowerCase().includes(q) ||
        String(o.status || '').toLowerCase().includes(q)
      );
    });
  }

  private toCard(o: any, idx: number) {
    const created = o?.created_at || o?.createdAt || o?.orderDate || new Date().toISOString();
    const total = Number(o?.sale ?? o?.total ?? o?.totalsale ?? 0) || 0;
    const itemsCount = Array.isArray(o?.items) ? o.items.length : (Array.isArray(o?.orderDetails) ? o.orderDetails.length : (o?.items_count || 0));
    return {
      id: o?.id ?? o?._id ?? idx,
      tableNo: o?.tableNo || o?.table || o?.table_number || 'T-?',
      status: this.normalizeStatus(o?.status),
      total,
      itemsCount,
      created,
      customer: o?.customerName || o?.customer || 'Guest',
      waiter: o?.waiterName || o?.waiter || '',
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
    const win = window.open('', '_blank', 'width=380,height=800');
    if (!win) return;
    const created = new Date(o?.created || Date.now());
    // 80mm receipt style, monospace for alignment
    const line = (text: string = '', width = 32) => {
      const t = String(text);
      return t.length >= width ? t.slice(0, width) : t + ' '.repeat(width - t.length);
    };
    const center = (text: string, width = 32) => {
      const t = String(text);
      const pad = Math.max(0, Math.floor((width - t.length) / 2));
      return ' '.repeat(pad) + t + ' '.repeat(Math.max(0, width - pad - t.length));
    };
    const money = (n: any) => (Number(n) || 0).toFixed(2);
    const w = 32; // 32 chars ~ 80mm at 12px monospace
    const total = money(o?.total);
    const header = [
      // logo placeholder line (replaced below in HTML with an <img>)
      center('', w),
      center('INVOICE', w),
      '─'.repeat(w),
      line(`Order #${o?.id}`, w),
      line(`Date  : ${created.toLocaleString()}`, w),
      line(`Table : ${o?.tableNo || ''}`, w),
      line(`Cashier: ${o?.waiter || '—'}`, w),
      line(`Customer: ${o?.customer || 'Guest'}`, w),
      '─'.repeat(w),
      line('Items', w),
    ].join('\n');

    // We only know itemsCount and total here. Show a single summary line.
    const body = [
      line(`Completed Items: ${o?.itemsCount ?? 0}`, w),
      '─'.repeat(w),
      line(`TOTAL: $${total}`, w),
      '─'.repeat(w),
      center('PAID ✓', w),
      center('Thank you for visiting!', w),
    ].join('\n');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice #${o?.id}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body { margin: 0; }
    .ticket {
      width: 80mm;
      padding: 6mm 4mm 4mm 4mm;
      box-sizing: border-box;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      white-space: pre;
    }
    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 2mm 0 1mm 0;
    }
    .brand img {
      width: 42mm;
      max-height: 16mm;
      object-fit: contain;
      filter: grayscale(0%);
    }
    .brand-name {
      font-weight: 800;
      font-size: 12px;
      margin-top: 2mm;
    }
  </style>
  <script>
    function onLoaded(){
      setTimeout(()=>{ window.print(); }, 50);
    }
  </script>
  </head>
  <body onload="onLoaded()">
    <div class="brand">
      <img src="${this.logoSrc}" onerror="this.style.display='none'" alt="Logo" />
      <div class="brand-name">Sangat Food</div>
    </div>
    <pre class="ticket">${header}\n${body}</pre>
  </body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
