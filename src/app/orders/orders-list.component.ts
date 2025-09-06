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

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.fetchOrders();
  }

  fetchOrders() {
    this.loading = true;
    this.error = null;
    this.orderService.getAllOrders().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.orders || []);
        this.orders = (data || []).map((o: any, idx: number) => this.toCard(o, idx));
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
    order.status = normalized;
    this.orderService.updateOrderStatus(order.id, normalized).subscribe({
      next: () => {
        this.editingStatusId = null;
      },
      error: () => {
        // revert on failure
        order.status = prev;
        this.editingStatusId = null;
      },
    });
  }

  private normalizeStatus(val: any): OrderStatus {
    const s = String(val || '').toLowerCase();
    if (s === 'cooking' || s === 'cook' || s === 'cokking') return OrderStatus.Cooking;
    if (s === 'completed' || s === 'complete' || s === 'done') return OrderStatus.Completed;
    return OrderStatus.Pending;
  }
}

