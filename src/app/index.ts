import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { toggleAnimation } from 'src/app/shared/animations';
import { OrderService } from 'src/app/services/order.service';
import { Router } from '@angular/router';
import { OrderStatus } from './orders/order-status.enum';

@Component({
    templateUrl: './index.html',
    animations: [toggleAnimation],
})
export class IndexComponent {
    store: any;
    revenueChart: any;
    salesByCategory: any;
    dailySales: any;
    totalOrders: any;
    monthlySales: any;
    topSellingToday: Array<{ rank: number; name: string; qty: number; amount: number; image?: string }>= [];
    isLoading = true;

    // Dashboard mock data for the new design
    now = new Date();
    stats = {
        todayOrders: 6,
        todayEarnings: 6736,
        todayCustomers: 5,
        avgDailyEarnings: 1088.58,
        salesThisMonth: 13063,
    };

    // Shape compatible with All Orders card markup
    ordersToday: Array<{
        tableNo: string;
        customer: string;
        id: number;
        orderType: string;
        status: string;
        created: Date;
        itemsCount: number;
        total: number;
        waiter?: string;
    }> = [];
    constructor(public storeData: Store<any>, private orderService: OrderService, private router: Router) {
        this.initStore();
        this.isLoading = false;
        this.fetchDashboardOrders();
        // mock top-selling list
        this.topSellingToday = [
            { rank: 1, name: 'Hyderabadi Chicken Biryani', qty: 5, amount: 1500 },
            { rank: 2, name: 'Chilli Paneer', qty: 5, amount: 1200 },
            { rank: 3, name: 'Chicken Manchurian', qty: 4, amount: 1040 },
            { rank: 4, name: 'Paneer Tikka', qty: 3, amount: 750 },
            { rank: 5, name: 'Uttapam', qty: 5, amount: 650 },
        ];
    }

    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                const hasChangeTheme = this.store?.theme !== d?.theme;
                const hasChangeLayout = this.store?.layout !== d?.layout;
                const hasChangeMenu = this.store?.menu !== d?.menu;
                const hasChangeSidebar = this.store?.sidebar !== d?.sidebar;

                this.store = d;

                if (hasChangeTheme || hasChangeLayout || hasChangeMenu || hasChangeSidebar) {
                    if (this.isLoading || hasChangeTheme) {
                        this.initCharts(); //init charts
                    } else {
                        setTimeout(() => {
                            this.initCharts(); // refresh charts
                        }, 300);
                    }
                }
            });
    }

    initCharts() {
        const isDark = this.store.theme === 'dark' || this.store.isDarkMode ? true : false;
        const isRtl = this.store.rtlClass === 'rtl' ? true : false;

        // revenue
        this.revenueChart = {
            chart: {
                height: 325,
                type: 'area',
                fontFamily: 'Nunito, sans-serif',
                zoom: {
                    enabled: false,
                },
                toolbar: {
                    show: false,
                },
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                curve: 'smooth',
                width: 2,
                lineCap: 'square',
            },
            dropShadow: {
                enabled: true,
                opacity: 0.2,
                blur: 10,
                left: -7,
                top: 22,
            },
            colors: isDark ? ['#2196f3', '#e7515a'] : ['#1b55e2', '#e7515a'],
            markers: {
                discrete: [
                    {
                        seriesIndex: 0,
                        dataPointIndex: 6,
                        fillColor: '#1b55e2',
                        strokeColor: 'transparent',
                        size: 7,
                    },
                    {
                        seriesIndex: 1,
                        dataPointIndex: 5,
                        fillColor: '#e7515a',
                        strokeColor: 'transparent',
                        size: 7,
                    },
                ],
            },
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            xaxis: {
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                crosshairs: {
                    show: true,
                },
                labels: {
                    offsetX: isRtl ? 2 : 0,
                    offsetY: 5,
                    style: {
                        fontSize: '12px',
                        cssClass: 'apexcharts-xaxis-title',
                    },
                },
            },
            yaxis: {
                tickAmount: 7,
                labels: {
                    formatter: (value: number) => {
                        return value / 1000 + 'K';
                    },
                    offsetX: isRtl ? -30 : -10,
                    offsetY: 0,
                    style: {
                        fontSize: '12px',
                        cssClass: 'apexcharts-yaxis-title',
                    },
                },
                opposite: isRtl ? true : false,
            },
            grid: {
                borderColor: isDark ? '#191e3a' : '#e0e6ed',
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: true,
                    },
                },
                yaxis: {
                    lines: {
                        show: false,
                    },
                },
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                fontSize: '16px',
                markers: {
                    width: 10,
                    height: 10,
                    offsetX: -2,
                },
                itemMargin: {
                    horizontal: 10,
                    vertical: 5,
                },
            },
            tooltip: {
                marker: {
                    show: true,
                },
                x: {
                    show: false,
                },
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    inverseColors: !1,
                    opacityFrom: isDark ? 0.19 : 0.28,
                    opacityTo: 0.05,
                    stops: isDark ? [100, 100] : [45, 100],
                },
            },
            series: [
                {
                    name: 'Income',
                    data: [16800, 16800, 15500, 17800, 15500, 17000, 19000, 16000, 15000, 17000, 14000, 17000],
                },
                {
                    name: 'Expenses',
                    data: [16500, 17500, 16200, 17300, 16000, 19500, 16000, 17000, 16000, 19000, 18000, 19000],
                },
            ],
        };

        // sales by category
        this.salesByCategory = {
            chart: {
                type: 'donut',
                height: 460,
                fontFamily: 'Nunito, sans-serif',
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                width: 25,
                colors: isDark ? '#0e1726' : '#fff',
            },
            colors: isDark ? ['#5c1ac3', '#e2a03f', '#e7515a', '#e2a03f'] : ['#e2a03f', '#5c1ac3', '#e7515a'],
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '14px',
                markers: {
                    width: 10,
                    height: 10,
                    offsetX: -2,
                },
                height: 50,
                offsetY: 20,
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        background: 'transparent',
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '29px',
                                offsetY: -10,
                            },
                            value: {
                                show: true,
                                fontSize: '26px',
                                color: isDark ? '#bfc9d4' : undefined,
                                offsetY: 16,
                                formatter: (val: any) => {
                                    return val;
                                },
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                color: '#888ea8',
                                fontSize: '29px',
                                formatter: (w: any) => {
                                    return w.globals.seriesTotals.reduce(function (a: any, b: any) {
                                        return a + b;
                                    }, 0);
                                },
                            },
                        },
                    },
                },
            },
            labels: ['Apparel', 'Sports', 'Others'],
            states: {
                hover: {
                    filter: {
                        type: 'none',
                        value: 0.15,
                    },
                },
                active: {
                    filter: {
                        type: 'none',
                        value: 0.15,
                    },
                },
            },
            series: [985, 737, 270],
        };

        // daily sales
        this.dailySales = {
            chart: {
                height: 160,
                type: 'bar',
                fontFamily: 'Nunito, sans-serif',
                toolbar: {
                    show: false,
                },
                stacked: true,
                stackType: '100%',
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                width: 1,
            },
            colors: ['#e2a03f', '#e0e6ed'],
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        legend: {
                            position: 'bottom',
                            offsetX: -10,
                            offsetY: 0,
                        },
                    },
                },
            ],
            xaxis: {
                labels: {
                    show: false,
                },
                categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'],
            },
            yaxis: {
                show: false,
            },
            fill: {
                opacity: 1,
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '25%',
                },
            },
            legend: {
                show: false,
            },
            grid: {
                show: false,
                xaxis: {
                    lines: {
                        show: false,
                    },
                },
                padding: {
                    top: 10,
                    right: -20,
                    bottom: -20,
                    left: -20,
                },
            },
            series: [
                {
                    name: 'Sales',
                    data: [44, 55, 41, 67, 22, 43, 21],
                },
                {
                    name: 'Last Week',
                    data: [13, 23, 20, 8, 13, 27, 33],
                },
            ],
        };

        // total orders
        this.totalOrders = {
            chart: {
                height: 290,
                type: 'area',
                fontFamily: 'Nunito, sans-serif',
                sparkline: {
                    enabled: true,
                },
            },
            stroke: {
                curve: 'smooth',
                width: 2,
            },
            colors: isDark ? ['#00ab55'] : ['#00ab55'],
            labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
            yaxis: {
                min: 0,
                show: false,
            },
            grid: {
                padding: {
                    top: 125,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            fill: {
                opacity: 1,
                type: 'gradient',
                gradient: {
                    type: 'vertical',
                    shadeIntensity: 1,
                    inverseColors: !1,
                    opacityFrom: 0.3,
                    opacityTo: 0.05,
                    stops: [100, 100],
                },
            },
            tooltip: {
                x: {
                    show: false,
                },
            },
            series: [
                {
                    name: 'Sales',
                    data: [28, 40, 36, 52, 38, 60, 38, 52, 36, 40],
                },
            ],
        };

        // monthly sales (area) for the Sales This Month card
        this.monthlySales = {
            chart: {
                height: 260,
                type: 'area',
                fontFamily: 'Nunito, sans-serif',
                toolbar: { show: false },
                sparkline: { enabled: false },
            },
            series: [
                {
                    name: 'Sales',
                    data: [2300, 5000, 7000],
                },
            ],
            colors: ['#8b5cf6'], // purple-500
            stroke: {
                curve: 'smooth',
                width: 4,
            },
            markers: {
                size: 4,
                colors: ['#8b5cf6'],
                strokeWidth: 0,
                discrete: [
                    {
                        seriesIndex: 0,
                        dataPointIndex: 2,
                        fillColor: '#8b5cf6',
                        size: 6,
                    },
                ],
            },
            dataLabels: { enabled: false },
            grid: {
                borderColor: isDark ? '#191e3a' : '#f3f4f6',
                strokeDashArray: 4,
                yaxis: { lines: { show: true } },
                xaxis: { lines: { show: false } },
            },
            xaxis: {
                categories: ['10 Sep', '11 Sep', '12 Sep'],
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { fontSize: '12px' },
                },
            },
            yaxis: {
                labels: {
                    formatter: (val: number) => `$${val.toFixed(0)}`,
                    style: { fontSize: '12px' },
                },
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'light',
                    type: 'vertical',
                    shadeIntensity: 0.9,
                    gradientToColors: ['#a78bfa'], // lighter purple
                    inverseColors: false,
                    opacityFrom: 0.55,
                    opacityTo: 0.08,
                    stops: [0, 80, 100],
                },
            },
            tooltip: {
                x: { show: true },
                y: { formatter: (val: number) => `$${val.toFixed(2)}` },
            },
        };
    }

    // Navigate to Orders List page
    goToAllOrders() {
        this.router.navigate(['/orders/list']);
    }

    // Fetch first 3 orders for dashboard using same mapping as Orders list
    fetchDashboardOrders() {
        this.orderService.getAllOrders().subscribe({
            next: (res: any) => {
                const data = Array.isArray(res) ? res : (res?.data || res?.orders || []);
                const mapped = (data || []).map((o: any, idx: number) => this.toCard(o, idx));
                // Exclude Completed & Paid like Orders page
                const filtered = mapped.filter((o: any) => o.status !== OrderStatus.Completed && o.status !== OrderStatus.Paid);
                this.ordersToday = filtered.slice(0, 3);
            },
            error: () => {
                this.ordersToday = [];
            },
        });
    }

    // Map raw order to card shape (mirrors OrdersListComponent logic)
    private toCard(o: any, idx: number) {
        const created = o?.created_at || o?.createdAt || o?.orderDate || new Date().toISOString();
        const total = Number(o?.sale ?? o?.total ?? o?.totalsale ?? 0) || 0;
        const itemsCount = Array.isArray(o?.items)
            ? o.items.length
            : Array.isArray(o?.orderDetails)
            ? o.orderDetails.length
            : (o?.items_count || 0);
        // normalize order type
        const rawType = (o?.orderType ?? o?.delivery_type ?? o?.type ?? '').toString().toLowerCase();
        const orderType = rawType === 'delivery' ? 'delivery' : 'dine-in';
        return {
            id: (o?.id ?? o?._id ?? idx) as number,
            tableNo: o?.tableNo || o?.table || o?.table_number || 'T-?',
            status: this.normalizeStatus(o?.status),
            total,
            itemsCount,
            created: new Date(created),
            customer: o?.customerName || o?.customer || 'Guest',
            waiter: o?.waiterName || o?.waiter || '—',
            orderType,
        };
    }

    private normalizeStatus(val: any): any /* OrderStatus */ {
        const s = String(val || '').toLowerCase();
        if (s === 'cooking' || s === 'cook' || s === 'cokking') return OrderStatus.Cooking;
        if (s === 'completed' || s === 'complete' || s === 'done') return OrderStatus.Completed;
        if (s === 'paid' || s === 'pay' || s === 'payment') return OrderStatus.Paid;
        if (s === 'cancel' || s === 'cancell' || s === 'cancelled' || s === 'canceled') return OrderStatus.Cancel;
        return OrderStatus.Pending;
    }
}
