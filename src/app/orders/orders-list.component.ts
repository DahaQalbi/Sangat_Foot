import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OrderService } from 'src/app/services/order.service';
import { IdbService } from 'src/app/services/idb.service';
import { ToastService } from 'src/app/services/toast.service';
import { OrderStatus } from './order-status.enum';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
})
export class OrdersListComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  orders: any[] = [];
  editingStatusId: any = null;
  // Order status enum and options
  OrderStatus = OrderStatus;
  statusOptions = Object.values(OrderStatus);
  // search
  search = '';
  // order type filter tab: 'all' | 'delivery' | 'dine-in'
  selectedTab: 'all' | 'delivery' | 'dine-in' = 'all'; 

  private onlineHandler = () => this.syncPending().catch(() => {});

  constructor(private orderService: OrderService, private idb: IdbService, private toast: ToastService) {}

  ngOnInit(): void {
    this.fetchOrders();
    // attempt a sync on load and when connection comes back
    this.syncPending().catch(() => {});
    window.addEventListener('online', this.onlineHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
  }

  get filtered(): any[] {
    // 1) apply type tab
    let list = (this.orders || []);
    if (this.selectedTab === 'delivery') {
      list = list.filter((o: any) => (o.orderType === 'delivery'));
    } else if (this.selectedTab === 'dine-in') {
      list = list.filter((o: any) => (o.orderType === 'dine-in'));
    }
    // 2) apply search
    const q = (this.search || '').toLowerCase().trim();
    if (!q) return list;
    return list.filter((o: any) => {
      return (
        String(o.id).includes(q) ||
        String(o.customer || '').toLowerCase().includes(q) ||
        String(o.tableNo || '').toLowerCase().includes(q) ||
        String(o.waiter || '').toLowerCase().includes(q) ||
        String(o.status || '').toLowerCase().includes(q)
      );
    });
  }

  async fetchOrders() {
    this.loading = true;
    this.error = null;
    try {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (online) {
        // Online: fetch from API and refresh cache
        this.orderService.getAllOrders().subscribe({
          next: async (res: any) => {
            const serverData: any[] = Array.isArray(res) ? res : (res?.data || res?.orders || []);
            // Merge in any local pending/offline orders that aren't on the server by id
            let localAll: any[] = [];
            try { localAll = await this.idb.getAll<any>('orders'); } catch {}
            const pendingLocal = (localAll || []).filter((o: any) => o && (o.status === 'pending_sync' || o.offline === true));
            const serverIdSet = new Set((serverData || []).map((x: any) => String(x?.id ?? x?._id ?? '')));
            const merged = [...serverData, ...pendingLocal.filter((p: any) => !serverIdSet.has(String(p.id)))];

            const allCards = merged.map((o: any, idx: number) => this.toCard(o, idx));
            this.orders = allCards.filter((o: any) => o.status !== OrderStatus.Completed && o.status !== OrderStatus.Paid);
            this.loading = false;
            // update local cache in background with merged dataset
            try { await this.idb.replaceAll('orders', merged); } catch {}
          },
          error: async (err: any) => {
            // If API fails while online, fallback to local cache for display
            try {
              const local = await this.idb.getAll<any>('orders');
              const allLocal = (local || []).map((o: any, idx: number) => this.toCard(o, idx));
              this.orders = allLocal.filter((o: any) => o.status !== OrderStatus.Completed && o.status !== OrderStatus.Paid);
            } catch {}
            this.loading = false;
            this.error = err?.error?.message || 'Failed to load orders';
          },
        });
        return;
      }

      // Offline: show local cache only
      const local = await this.idb.getAll<any>('orders');
      const allLocal = (local || []).map((o: any, idx: number) => this.toCard(o, idx));
      this.orders = allLocal.filter((o: any) => o.status !== OrderStatus.Completed && o.status !== OrderStatus.Paid);
      this.loading = false;
    } catch (e) {
      this.loading = false;
      this.error = 'Failed to load orders';
    }
  }

  private toCard(o: any, idx: number) {
    const created = o?.created_at || o?.createdAt || o?.orderDate || new Date().toISOString();
    const total = Number(o?.sale ?? o?.total ?? o?.totalsale ?? 0) || 0;
    const itemsCount = Array.isArray(o?.items) ? o.items.length : (Array.isArray(o?.orderDetails) ? o.orderDetails.length : (o?.items_count || 0));
    // normalize order type: derive from orderType or delivery_type
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

  startEditStatus(orderId: any) {
    this.editingStatusId = orderId;
  }

  cancelEditStatus() {
    this.editingStatusId = null;
  }

  applyStatus(order: any, newStatus: string) {
    const prev = order.status;
    const normalized = this.normalizeStatus(newStatus);
    // If cancelling, delete the order via API
    if (normalized === OrderStatus.Cancel) {
      this.orderService.deleteOrder(order.id).subscribe({
        next: () => {
          this.editingStatusId = null;
          this.fetchOrders();
        },
        error: () => {
          // revert UI state
          order.status = prev;
          this.editingStatusId = null;
          this.fetchOrders();
        },
      });
      return;
    }
    // Otherwise update status normally
    order.status = normalized;
    this.orderService.updateOrderStatus(order.id, normalized).subscribe({
      next: () => {
        this.editingStatusId = null;
        // Refresh from server so All/Completed pages reflect latest state
        this.fetchOrders();
      },
      error: () => {
        // revert on failure
        order.status = prev;
        this.editingStatusId = null;
        // Also re-fetch to ensure UI consistency
        this.fetchOrders();
      },
    });
  }

  private normalizeStatus(val: any): OrderStatus {
    const s = String(val || '').toLowerCase();
    if (s === 'cooking' || s === 'cook' || s === 'cokking') return OrderStatus.Cooking;
    if (s === 'completed' || s === 'complete' || s === 'done') return OrderStatus.Completed;
    if (s === 'paid' || s === 'pay' || s === 'payment') return OrderStatus.Paid;
    if (s === 'cancel' || s === 'cancell' || s === 'cancelled' || s === 'canceled') return OrderStatus.Cancel;
    return OrderStatus.Pending;
  }

  // ------- Offline sync for pending orders saved in IndexedDB -------
  private async syncPending(): Promise<void> {
    try {
      // Only run when online
      if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) return;
      const all = await this.idb.getAll<any>('orders');
      const pending = (all || []).filter((o: any) => o && (o.status === 'pending_sync' || o.offline === true));
      if (!pending.length) return;

      for (let i = 0; i < pending.length; i++) {
        const local = pending[i];
        // Build payload compatible with API
        const payload = {
          id: local.id,
          tableNo: local.tableNo,
          orderType: local.orderType,
          discount: Number(local.discount) || 0,
          cost: Number(local.cost) || 0,
          sale: Number(local.sale) || 0,
          net: Number(local.net) || 0,
          status: local.status === 'pending_sync' ? 'pending' : (local.status || 'pending'),
          deal_id: local.deal_id ?? null,
          userId: local.userId ?? null,
          delivery_fee: Number(local.delivery_fee) || 0,
          note: local.note || '',
          delivery_type: local.delivery_type,
          address: local.address || '',
          sgst: Number(local.sgst) || 0,
          cgst: Number(local.cgst) || 0,
          orderDetails: Array.isArray(local.orderDetails) ? local.orderDetails.map((r: any, idx: number) => ({
            id: r.id || idx + 1,
            product_id: r.product_id,
            size: r.size,
            cost: Number(r.cost) || 0,
            sale: Number(r.sale) || 0,
            note: r.note || '',
          })) : [],
        };

        try {
          const res = await firstValueFrom(this.orderService.addOrder(payload));
          // Update local record on success
          const serverId = res?.data?.id ?? res?.orderId ?? res?.id ?? local.serverId;
          const updated = { ...local, serverId, offline: false, status: 'pending', updated_at: new Date().toISOString() };
          const idx = all.findIndex((o: any) => String(o.id) === String(local.id));
          if (idx !== -1) all[idx] = updated;
          await this.idb.replaceAll('orders', all);
        } catch {
          // keep it pending for next time
        }
      }

      if (pending.length) this.toast.success('Offline orders synced');
    } catch {
      // ignore
    }
  }
}

