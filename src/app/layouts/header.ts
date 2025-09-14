import { Component } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { Store } from '@ngrx/store';
import { Router, NavigationEnd } from '@angular/router';
import { AppService } from '../service/app.service';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';

@Component({
    selector: 'header',
    templateUrl: './header.html',
    animations: [toggleAnimation],
})
export class HeaderComponent {
    store: any;
    search = false;
    // When true, hide all header icons/menus except the bell notifications
    showOnlyBell = true;
    // When true, the DP dropdown will only show the Sign Out item
    showOnlySignOut = true;
    // Default and environment logo handling
    readonly defaultLogo = '/assets/images/logo.svg';
    logoSrc: string = (environment.logo && environment.logo.trim()) ? environment.logo : this.defaultLogo;
    // User info from localStorage('auth')
    userName: string | null = null;
    userEmail: string | null = null;
    userRole: string | null = null;
    userPhone: string | null = null;
    userImageSrc: string = '/assets/images/user-profile.jpeg';
    userInitials: string = 'US';
    // Show a green dot on bell when a new order has been placed
    newOrderDot = false;

    notifications = [
        {
            id: 1,
            profile: 'user-profile.jpeg',
            message: '<strong class="text-sm mr-1">John Doe</strong>invite you to <strong>Prototyping</strong>',
            time: '45 min ago',
        },
        {
            id: 2,
            profile: 'profile-34.jpeg',
            message: '<strong class="text-sm mr-1">Adam Nolan</strong>mentioned you to <strong>UX Basics</strong>',
            time: '9h Ago',
        },
        {
            id: 3,
            profile: 'profile-16.jpeg',
            message: '<strong class="text-sm mr-1">Anna Morgan</strong>Upload a file',
            time: '9h Ago',
        },
    ];
    messages = [
        {
            id: 1,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>`,
            ),
            title: 'Congratulations!',
            message: 'Your OS has been updated.',
            time: '1hr',
        },
        {
            id: 2,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`,
            ),
            title: 'Did you know?',
            message: 'You can switch between artboards.',
            time: '2hr',
        },
        {
            id: 3,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"> <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>`,
            ),
            title: 'Something went wrong!',
            message: 'Send Reposrt',
            time: '2days',
        },
        {
            id: 4,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>`,
            ),
            title: 'Warning',
            message: 'Your password strength is low.',
            time: '5days',
        },
    ];

    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private appSetting: AppService,
        private sanitizer: DomSanitizer,
        private auth: AuthService,
    ) {
        this.initStore();
    }

    private loadUserFromLocalStorage() {
        try {
            const raw = localStorage.getItem('auth');
            if (!raw) return;
            const u = JSON.parse(raw);
            this.userName = (u?.name ?? '') || null;
            this.userEmail = (u?.email ?? '') || null;
            this.userRole = (u?.role ?? '') || null;
            this.userPhone = (u?.phone ?? '') || null;
            this.userInitials = this.computeInitials(this.userName || '');
            const img = (u?.image ?? '') || '';
            if (img) {
                const isAbs = /^https?:\/\//i.test(img);
                this.userImageSrc = isAbs ? img : img.startsWith('/') ? img : `${environment.imgUrl || ''}${img}`;
            }
        } catch {}
    }

    private computeInitials(name: string): string {
        const n = (name || '').trim();
        if (!n) return 'US';
        const parts = n.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    private loadNewOrderDot() {
        try {
            this.newOrderDot = localStorage.getItem('hasNewOrder') === '1';
        } catch { this.newOrderDot = false; }
    }
    onLogoError() {
        if (this.logoSrc !== this.defaultLogo) {
            this.logoSrc = this.defaultLogo;
        }
    }
    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    ngOnInit() {
        this.loadUserFromLocalStorage();
        this.loadNewOrderDot();
        this.setActiveDropdown();
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.setActiveDropdown();
            }
        });
    }

    setActiveDropdown() {
        const selector = document.querySelector('ul.horizontal-menu a[routerLink="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
            for (let i = 0; i < all.length; i++) {
                all[0]?.classList.remove('active');
            }
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
                if (ele) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele?.classList.add('active');
                    });
                }
            }
        }
    }

    removeNotification(value: number) {
        this.notifications = this.notifications.filter((d) => d.id !== value);
    }

    removeMessage(value: number) {
        this.messages = this.messages.filter((d) => d.id !== value);
    }

    changeLanguage(item: any) {
        this.translate.use(item.code);
        this.appSetting.toggleLanguage(item);
        if (this.store.locale?.toLowerCase() === 'ae') {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'rtl' });
        } else {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'ltr' });
        }
        window.location.reload();
    }

    async onLogout() {
        try {
            await this.auth.logout();
        } catch {}
        this.router.navigate(['/auth/boxed-signin']);
    }

    gotoOrders() {
        try { localStorage.removeItem('hasNewOrder'); } catch {}
        this.newOrderDot = false;
        this.router.navigate(['/orders/list']);
    }
}
