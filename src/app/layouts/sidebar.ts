import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { slideDownUp } from '../shared/animations';
import { environment } from 'src/environments/environment';
import { StorageService } from 'src/app/services/storage.service';
import { Role } from 'src/app/enums/role.enum';

@Component({
    selector: 'sidebar',
    templateUrl: './sidebar.html',
    animations: [slideDownUp],
})
export class SidebarComponent {
    active = false;
    store: any;
    activeDropdown: string[] = [];
    parentDropdown: string = '';
    // Control visibility of menus from environment
    isshow: boolean = (environment as any).isshow !== undefined ? (environment as any).isshow : false;
    // Default and environment logo handling
    readonly defaultLogo = '/assets/images/logo_Sangat.png';
    logoSrc: string = (environment.logo && environment.logo.trim()) ? environment.logo : this.defaultLogo;
    role: Role | null = null;
    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private storage: StorageService,
    ) {
        this.initStore();
        // Initialize role synchronously from localStorage to prevent initial flicker
        try {
            const authLS = JSON.parse(localStorage.getItem('auth') || 'null');
           this.role = authLS.data[0].role;
            console.log(this.role);
        } catch {}
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
        this.setActiveDropdown();
        this.initRole();
    }

    setActiveDropdown() {
        const selector = document.querySelector('.sidebar ul a[routerLink="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }

    toggleMobileMenu() {
        if (window.innerWidth < 1024) {
            this.storeData.dispatch({ type: 'toggleSidebar' });
        }
    }

    toggleAccordion(name: string, parent?: string) {
        if (this.activeDropdown.includes(name)) {
            this.activeDropdown = this.activeDropdown.filter((d) => d !== name);
        } else {
            this.activeDropdown.push(name);
        }
    }

    private async initRole() {
        try {
            const auth = await this.storage.get<any>('auth')
              ?? JSON.parse(localStorage.getItem('auth') || 'null');
            this.role = auth.data[0].role;
        } catch {
            this.role = null;
        }
    }
    get canAddOrder(): boolean {
        // waiter, manager, admin
        return this.role === Role.Waiter || this.role === Role.Manager || this.role === Role.Admin || this.role === null; // default show until role resolves
    }

    get canViewOrders(): boolean {
        // manager, admin
        return this.role === Role.Manager || this.role === Role.Admin || this.role === null;
    }

    get isWaiter(): boolean {
        return this.role === Role.Waiter;
    }

    get isManager(): boolean {
        return this.role === Role.Manager;
    }

    get isAdmin(): boolean {
        return this.role === Role.Admin;
    }
}
