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
    // Normalize fields
    const createdStr = o?.create_at || o?.created_at || o?.createdAt || new Date().toISOString();
    const createdAt = new Date(createdStr).toLocaleString();
    const rawList: any[] = Array.isArray(o?.orderItems)
      ? o.orderItems
      : (Array.isArray(o?.items)
        ? o.items
        : (Array.isArray(o?.orderDetails)
          ? o.orderDetails
          : []));
    const rows: any[] = rawList.map((it: any) => {
      const qty = Number(it?.qty ?? it?.quantity ?? it?.Quantity ?? 1) || 1;
      const unit = Number(it?.sale ?? it?.price ?? it?.amount ?? it?.unitPrice ?? 0) || 0;
      const baseName = it?.name || it?.product?.name || 'Item';
      const sizeTxt = (it?.size || it?.selectedSize?.type) ? ` (${it?.size || it?.selectedSize?.type})` : '';
      return { qty, name: `${baseName}${sizeTxt}`, sale: unit, line: qty * unit };
    });
    const sale = rows.reduce((a, r) => a + r.line, 0);
    const discount = Number(o?.discount || 0);
    const delivery = Number(o?.delivery_fee || 0);
    const sgstPct = Number(o?.sgst || 0);
    const cgstPct = Number(o?.cgst || 0);
    const sgstAmount = +(sale * sgstPct / 100).toFixed(2);
    const cgstAmount = +(sale * cgstPct / 100).toFixed(2);
    const localNet = +((sale - discount + delivery + sgstAmount + cgstAmount)).toFixed(2);
    const company = (localStorage.getItem('companyName') || 'Sangat Fast Food');
    const addressL1 = localStorage.getItem('companyAddressL1') || 'Tando adam Chowk Shahdadpur';
    const addressL2 = localStorage.getItem('companyAddressL2') || 'Dist:Sanghar Sindh';
    const phone = localStorage.getItem('companyPhone') || 'Phone:03353878664';
    const currency = localStorage.getItem('currencySymbol') || '$';
    const fmt = (n: number) => `${currency}${(Number(n)||0).toFixed(2)}`;
    const status = (o?.status || 'completed').toString().trim().toUpperCase();

    const styles = `
      <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111; }
        .receipt { width: 300px; max-width: 90vw; margin: 0 auto; padding: 12px; }
        .center { text-align: center; }
        .title { font-weight: 800; font-size: 16px; margin: 0; }
        .sub { font-size: 11px; line-height: 1.3; margin: 2px 0; color: #111; }
        .dots { border-top: 2px dotted #000; margin: 8px 0; height: 0; }
        .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin: 6px 0; }
        .status { text-align: center; font-weight: 700; font-size: 12px; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { font-size: 12px; padding: 4px 0; }
        th.qty, td.qty { padding-right: 8px; }
        th.name, td.name { padding-left: 6px; }
        th.name { white-space: nowrap; word-break: keep-all; }
        thead th { border-bottom: 2px solid #000; }
        tbody td { border-bottom: 1px dotted #999; }
        .num { text-align: right; }
        .totals td { padding: 3px 0; border: 0; }
        .totals .label { text-align: left; }
        .totals .val { text-align: right; }
        .grand { font-weight: 800; font-size: 14px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .receipt { width: 58mm; padding: 6px; } }
      </style>
    `;

    const itemsHtml = rows.map((r) => `
      <tr>
        <td class="num qty">${r.qty}</td>
        <td class="name">${(r.name || '').toString().replace(/[&<>"']/g, (c: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as Record<string,string>)[c])}</td>
        <td class="num">${fmt(r.sale)}</td>
        <td class="num">${fmt(r.line)}</td>
      </tr>
    `).join('');

    const taxesHtml = (sgstPct || cgstPct) ? `
      <tr><td class="label">SGST (${sgstPct}%)</td><td class="val">${fmt(sgstAmount)}</td></tr>
      <tr><td class="label">CGST (${cgstPct}%)</td><td class="val">${fmt(cgstAmount)}</td></tr>
    ` : '';

    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Order ${o?.id} - Receipt</title>
        ${styles}
      </head>
      <body>
        <div class="receipt">
          <div class="center">
            <h2 class="title">${company}</h2>
            <div class="sub">${addressL1}</div>
            <div class="sub">${addressL2}</div>
            <div class="sub">${phone}</div>
          </div>
          <div class="dots"></div>
          <div class="status">${status}</div>
          <div class="meta-row">
            <div>Order #${o?.id ?? ''}</div>
            <div>${createdAt}</div>
          </div>
          <div class="dots"></div>
          <table>
            <thead>
              <tr>
                <th class="num qty" style="width:36px;">Qty</th>
                <th class="name">Item&nbsp;Name</th>
                <th class="num" style="width:62px;">Price</th>
                <th class="num" style="width:68px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="dots"></div>
          <table class="totals">
            <tr><td class="label">Sub Total:</td><td class="val">${fmt(sale)}</td></tr>
            <tr><td class="label">Discount:</td><td class="val">${fmt(discount)}</td></tr>
            <tr><td class="label">Delivery Fee:</td><td class="val">${fmt(delivery)}</td></tr>
            ${taxesHtml}
            <tr><td class="label grand">Total:</td><td class="val grand">${fmt(localNet)}</td></tr>
          </table>
          <div class="dots"></div>
        </div>
      </body>
    </html>`;

    this.printHtmlViaIframe(html);
  }

  private printHtmlViaIframe(html: string): void {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) { document.body.removeChild(iframe); return; }
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {}
        setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 800);
      }, 200);
    } catch {}
  }
}
