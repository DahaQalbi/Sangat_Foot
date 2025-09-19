import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService } from 'src/app/services/product.service';
import { IdbService } from 'src/app/services/idb.service';
import { ToastService } from 'src/app/services/toast.service';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

@Component({
  templateUrl: './all-products.html',
})
export class AllProductsComponent implements OnInit, AfterViewInit {
  loading = false;
  error: string | null = null;
  products: any[] = [];
  categories: string[] = [];
  selectedCategory: string = 'All';
  categoryCounts: Record<string, number> = {};
  @ViewChild('chipScroller', { static: false }) chipScroller?: ElementRef<HTMLDivElement>;
  canScrollLeft = false;
  canScrollRight = false;
  constructor(
    private productService: ProductService,
    private toast: ToastService,
    private idb: IdbService,
    private router: Router,
  ) {}

  // Normalize gallery entry to image src string
  gallerySrc(g: unknown): string {
    try {
      const obj: any = g as any;
      const path: string = (obj?.image ?? obj?.src ?? obj?.path ?? obj?.url ?? obj) as string;
      return String(path || '');
    } catch {
      return '';
    }
  }

  onEdit(p: any): void {
    this.router.navigate(['/products/add-product'], { state: { product: p, isUpdate: true } });
  }

  async ngOnInit(): Promise<void> {
    await this.loadFromCache();
    this.fetch();
  }

  private async loadFromCache(): Promise<void> {
    try {
      const cached = await this.idb.getAll<any>('products');
      if (Array.isArray(cached) && cached.length) {
        this.products = cached;
        this.computeCategories();
        // ensure arrows visibility is correct after initial paint
        setTimeout(() => {
          this.resetChipScrollToStart();
          this.updateArrowVisibility();
        }, 0);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read products cache', e);
    }
  }

  ngAfterViewInit(): void {
    // Delay to allow template to render chips
    setTimeout(() => {
      this.resetChipScrollToStart();
      this.updateArrowVisibility();
    }, 0);
  }

  @HostListener('window:resize')
  onResize() {
    this.updateArrowVisibility();
  }

  fetch(): void {
    if (!this.products.length) this.loading = true;
    this.error = null;
    this.idb
      .getAll<any>('products')
      .then((list) => {
        this.products = Array.isArray(list) ? list : [];
        this.computeCategories();
        this.loading = false;
        setTimeout(() => {
          this.resetChipScrollToStart();
          this.updateArrowVisibility();
        }, 0);
      })
      .catch(() => {
        this.products = [];
        this.loading = false;
        this.error = 'No local products found in IndexedDB';
      });
  }

  private normalizedProductsForCache(): any[] {
    return (this.products || []).map((p: any, idx: number) => {
      let productId = p?.productId ?? p?.id;
      if (productId === undefined || productId === null || productId === '') {
        productId = `p_${Date.now()}_${idx}`;
      }
      return { ...p, productId };
    });
  }

  onDelete(p: any): void {
    const pid = p?.id ?? p?.productId;
    if (pid === undefined || pid === null) {
      this.toast.error('Invalid product id');
      return;
    }
    Swal.fire({
      title: 'Delete product?',
      text: `Are you sure you want to delete ${p?.name || 'this product'}? This action cannot be undone.`,
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
      if (res.isConfirmed) {
        this.loading = true;
        this.productService.deleteProduct(Number(pid)).subscribe({
          next: async () => {
            this.toast.success('Product deleted successfully');
            // Update UI
            this.products = (this.products || []).filter((x: any) => (x?.id ?? x?.productId) !== pid);
            this.computeCategories();
            // Update cache atomically
            try {
              const forCache = this.normalizedProductsForCache();
              await this.idb.replaceAll('products', forCache);
            } catch (e) {
              // ignore cache errors
            }
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.toast.error('Failed to delete product');
          },
        });
      }
    });
  }

  private computeCategories(): void {
    const counts: Record<string, number> = {};
    for (const p of this.products || []) {
      const c = (p?.category?.name || p?.category || '').toString().trim();
      if (!c) continue;
      counts[c] = (counts[c] || 0) + 1;
    }
    const unique = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    this.categoryCounts = { All: (this.products || []).length, ...counts };
    this.categories = ['All', ...unique];
    if (!this.categories.includes(this.selectedCategory)) this.selectedCategory = 'All';
  }

  get filteredProducts(): any[] {
    if (!this.selectedCategory || this.selectedCategory === 'All') return this.products;
    const sel = this.selectedCategory.toLowerCase();
    return (this.products || []).filter((p) => {
      const c = (p?.category?.name || p?.category || '').toString().toLowerCase();
      return c === sel;
    });
  }

  get categoryItems(): { name: string; count: number }[] {
    return (this.categories || []).map((name) => ({ name, count: this.categoryCounts[name] ?? 0 }));
  }

  // Horizontal scroll control for chips
  scrollChips(direction: 'left' | 'right'): void {
    const el = this.chipScroller?.nativeElement;
    if (!el) return;
    const children = Array.from(el.querySelectorAll('button')) as HTMLElement[];
    if (!children.length) return;

    const viewportStart = el.scrollLeft;
    const viewportEnd = el.scrollLeft + el.clientWidth;

    let targetLeft = direction === 'right' ? viewportEnd : viewportStart;

    if (direction === 'right') {
      // find first chip that starts after the current viewport
      const next = children.find((chip) => chip.offsetLeft >= viewportEnd - 40);
      targetLeft = next ? Math.max(next.offsetLeft - 10, 0) : viewportEnd + Math.ceil(el.clientWidth * 0.5);
    } else {
      // find the last chip that starts before the current viewport
      for (let i = children.length - 1; i >= 0; i--) {
        const chip = children[i];
        if (chip.offsetLeft < viewportStart - 10) {
          targetLeft = Math.max(chip.offsetLeft - 10, 0);
          break;
        }
      }
    }

    el.scrollTo({ left: targetLeft, behavior: 'smooth' });
    // After animation, reassess
    setTimeout(() => this.updateArrowVisibility(), 350);
  }

  onChipScroll(): void {
    this.updateArrowVisibility();
  }

  private updateArrowVisibility(): void {
    const el = this.chipScroller?.nativeElement;
    if (!el) return;
    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.round(el.scrollLeft);
    this.canScrollLeft = left > 1; // small tolerance for sub-pixel
    this.canScrollRight = left + el.clientWidth < maxScrollLeft - 1; // small tolerance
  }

  selectCategory(name: string): void {
    this.selectedCategory = name;
    // If selection changes chip widths, reassess arrows shortly
    setTimeout(() => this.updateArrowVisibility(), 0);
  }

  private resetChipScrollToStart(): void {
    const el = this.chipScroller?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: 0 });
  }
}
