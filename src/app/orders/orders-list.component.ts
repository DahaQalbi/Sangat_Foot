import { Component, OnInit } from '@angular/core';
import { OrderService } from 'src/app/services/order.service';
import { OrderStatus } from './order-status.enum';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
})
export class OrdersListComponent implements OnInit {
  loading = false;
  error: string | null = null;
  orders: any[] = [];
  editingStatusId: any = null;
  // Order status enum and options
  OrderStatus = OrderStatus;
  statusOptions = Object.values(OrderStatus);
  // search
  search = '';

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.fetchOrders();
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

  fetchOrders() {
    this.loading = true;
    this.error = null;
    this.orderService.getAllOrders().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.orders || []);
        const all = (data || []).map((o: any, idx: number) => this.toCard(o, idx));
        // Exclude completed & paid orders here; they are listed on their own pages
        this.orders = all.filter((o: any) => o.status !== OrderStatus.Completed && o.status !== OrderStatus.Paid);
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load orders';
      },
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
}

