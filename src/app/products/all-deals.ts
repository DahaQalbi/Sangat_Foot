import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from 'src/app/services/order.service';
import { ToastService } from 'src/app/services/toast.service';
import { IdbService } from 'src/app/services/idb.service';
import { ProductService } from 'src/app/services/product.service';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

@Component({
  templateUrl: './all-deals.html',
})
export class AllDealsComponent implements OnInit {
  loading = false;
  error: string | null = null;
  deals: any[] = [];
  products: any[] = [];
  imgUrl: string = environment.imgUrl;
  // slider state per deal id
  sliderIndex: Record<string | number, number> = {};
  // multi-select cart of aggregated items from deals
  cart: Array<{ productId: any; name: string; category: any; selectedSize: { type: any; sale: number; cost: number }; qty: number }> = [];
  cartOpen = false;

  constructor(
    private orderService: OrderService,
    private toast: ToastService,
    private idb: IdbService,
    private productService: ProductService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fetch();
    this.fetchProducts();
  }

  // --- Delete deal ---
  private pickDealId(d: any): string | number | null {
    return d?.id ?? d?._id ?? null;
  }

  confirmDeleteDeal(d: any) {
    const id = this.pickDealId(d);
    if (id == null) {
      this.toast.error('Cannot determine deal id');
      return;
    }
    Swal.fire({
      title: 'Delete deal?',
      text: `Are you sure you want to delete ${d?.name || 'this deal'}? This action cannot be undone.`,
      icon: undefined,
      iconHtml:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
      background: '#ffffff',
      color: '#111827',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      customClass: {
        popup: 'rounded-lg shadow-xl',
        icon: '!text-red-600',
        confirmButton: 'swal2-confirm !bg-red-600 !text-white !uppercase !font-extrabold !px-4 !py-2.5 !rounded-md hover:!bg-red-700',
        cancelButton: 'swal2-cancel !bg-white !text-gray-700 !font-semibold !px-4 !py-2.5 !rounded-md !border !border-gray-300 hover:!bg-gray-100',
        title: 'font-extrabold text-red-600',
      },
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loading = true;
      this.orderService.deleteDeal(id).subscribe({
        next: () => {
          this.loading = false;
          this.toast.success('Deal deleted successfully');
          this.deals = (this.deals || []).filter((x: any) => (x?.id ?? x?._id) !== id);
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err?.error?.message || 'Failed to delete deal');
        },
      });
    });
  }

  // --- Slider helpers ---
  getDealImages(d: any): string[] {
    const items = (d?.items || d?.dealItem || []) as any[];
    const imgs = items
      .map((it) => it?.image ? (this.imgUrl + it.image) : '')
      .filter((u) => !!u);
    // Fallback: if no item image, use a placeholder
    return imgs.length ? imgs : ['/assets/images/placeholder.png'];
  }

  currentSlide(d: any): number {
    const id = d?.id ?? d?._id ?? JSON.stringify(d);
    const max = this.getDealImages(d).length;
    const idx = this.sliderIndex[id] ?? 0;
    return Math.max(0, Math.min(idx, Math.max(0, max - 1)));
  }

  nextImage(d: any) {
    const id = d?.id ?? d?._id ?? JSON.stringify(d);
    const max = this.getDealImages(d).length;
    const cur = this.currentSlide(d);
    this.sliderIndex[id] = (cur + 1) % Math.max(1, max);
  }

  prevImage(d: any) {
    const id = d?.id ?? d?._id ?? JSON.stringify(d);
    const max = this.getDealImages(d).length;
    const cur = this.currentSlide(d);
    this.sliderIndex[id] = (cur - 1 + Math.max(1, max)) % Math.max(1, max);
  }

  fetch(): void {
    this.loading = true;
    this.error = null;
    this.orderService.getAllDeals().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.deals || []);
        this.deals = data || [];
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load deals';
        this.toast.error(this.error || 'Failed to load deals');
      },
    });
  }

  private fetchProducts(): void {
    this.productService.getAllProducts().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || res?.products || []);
        this.products = Array.isArray(data) ? data : [];
      },
      error: () => {
        // keep silent; ordering will fallback to zeros if not found
      },
    });
  }

  private findProduct(productId: any): any | null {
    const pid = String(productId);
    return (this.products || []).find((p: any) => String(p?.productId ?? p?.id) === pid) || null;
  }

  private buildSummaryFromDeal(deal: any): { items: any[]; totalsale: number; totalcost: number } {
    const items = (deal?.items || deal?.dealItem || []).map((it: any) => {
      const p = this.findProduct(it.product_id) || {};
      const sizes = Array.isArray(p?.sizeType) ? p.sizeType : [];
      const match = sizes.find((s: any) => String(s?.type) === String(it?.sizeType)) || {};
      const selectedSize = {
        type: String(it?.sizeType || match?.type || 'Default'),
        sale: Number(match?.sale ?? 0) || 0,
        cost: Number(match?.cost ?? 0) || 0,
      };
      const category = (p.category && (p.category.name || p.category)) || p.category_id || '';
      return {
        qty: Number(it?.quantity) || 1,
        productId: it?.product_id,
        name: p?.name || `Item #${it?.product_id}`,
        category,
        selectedSize,
      };
    });
    const totalsale = items.reduce((a: number, r: any) => a + (r.selectedSize.sale * r.qty), 0);
    const totalcost = items.reduce((a: number, r: any) => a + (r.selectedSize.cost * r.qty), 0);
    return { items, totalsale, totalcost };
  }

  async placeOrderFromDeal(deal: any) {
    // Backward-compat single-click checkout: add to cart and open footer
    this.addDealToCart(deal);
  }

  // --- Cart aggregation ---
  addDealToCart(deal: any) {
    const s = this.buildSummaryFromDeal(deal);
    for (const it of s.items) {
      const key = `${it.productId}__${it.selectedSize?.type}`;
      const foundIdx = this.cart.findIndex(c => `${c.productId}__${c.selectedSize?.type}` === key);
      if (foundIdx >= 0) {
        this.cart[foundIdx].qty += Number(it.qty) || 0;
      } else {
        this.cart.push({
          productId: it.productId,
          name: it.name,
          category: it.category,
          selectedSize: { ...it.selectedSize },
          qty: Number(it.qty) || 1,
        });
      }
    }
    this.toast.success('Deal added to order');
  }

  removeCartItem(index: number) {
    if (index >= 0 && index < this.cart.length) this.cart.splice(index, 1);
  }

  toggleCart() {
    this.cartOpen = !this.cartOpen;
  }

  incQty(index: number) {
    if (index < 0 || index >= this.cart.length) return;
    this.cart[index].qty = Number(this.cart[index].qty || 0) + 1;
  }

  decQty(index: number) {
    if (index < 0 || index >= this.cart.length) return;
    const next = Number(this.cart[index].qty || 0) - 1;
    if (next <= 0) {
      this.removeCartItem(index);
    } else {
      this.cart[index].qty = next;
    }
  }

  clearCart() {
    this.cart = [];
  }

  get cartTotalsale(): number {
    return this.cart.reduce((a, r) => a + (Number(r.selectedSize?.sale || 0) * Number(r.qty || 0)), 0);
  }

  get cartTotalcost(): number {
    return this.cart.reduce((a, r) => a + (Number(r.selectedSize?.cost || 0) * Number(r.qty || 0)), 0);
  }

  async proceedToOrder() {
    if (!this.cart.length) return;
    const summary = {
      items: this.cart.map(it => ({
        productId: it.productId,
        name: it.name,
        category: it.category,
        selectedSize: { ...it.selectedSize },
        qty: it.qty,
      })),
      totalsale: this.cartTotalsale,
      totalcost: this.cartTotalcost,
    };
    try {
      const draftId = Date.now();
      const orderDraft = {
        id: draftId,
        customerName: '',
        phone: '',
        notes: `Deals: ${this.cart.length} selected`,
        items: summary.items.map((it: any) => ({
          productId: it.productId,
          name: it.name,
          price: it.selectedSize.sale,
          qty: it.qty,
          product: {
            id: it.productId,
            name: it.name,
            category: it.category,
            sizeType: [{ type: it.selectedSize.type, sale: it.selectedSize.sale, cost: it.selectedSize.cost }],
            selectedSize: { ...it.selectedSize },
          },
        })),
        total: summary.totalsale,
        created_at: new Date().toISOString(),
        status: 'draft',
      };
      await this.idb.putAll('orders', [orderDraft]);
      this.router.navigate(['/orders/table'], {
        queryParams: { id: draftId },
        state: { orderDraft, summary },
      });
      // clear cart after navigation initiates
      this.cart = [];
    } catch (e) {
      this.toast.error('Failed to proceed to order');
    }
  }
}
