import { Component } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { environment } from 'src/environments/environment';

@Component({
    templateUrl: './profile.html',
    animations: [toggleAnimation],
})
export class ProfileComponent {
    constructor() {
        this.loadUserFromLocalStorage()
    }
    userName: string | null = null;
    userEmail: string | null = null;
    userRole: string | null = null;
    userPhone: string | null = null;
    userImageSrc: string = '/assets/images/user-profile.jpeg';
    userInitials: string = 'US';
    // Agreement and ID card fields
    agreementSrc: string | null = null;
    agreementIsPdf: boolean = false;
    agreementIsPng: boolean = false;
    idCardFrontSrc: string | null = null;
    idCardBackSrc: string | null = null;
    private computeInitials(name: string): string {
        const n = (name || '').trim();
        if (!n) return 'US';
        const parts = n.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    private toAbsoluteUrl(path: string): string {
        const p = (path || '').trim();
        if (!p) return p;
        const isAbs = /^https?:\/\//i.test(p);
        if (isAbs) return p;
        return p.startsWith('/') ? p : `${environment.imgUrl || ''}${p}`;
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
                this.userImageSrc = this.toAbsoluteUrl(img);
            }

            // Agreement (try multiple possible keys)
            const agreement = ( u?.agrement ) as string;
            if (agreement) {
                const url = this.toAbsoluteUrl(agreement);
                this.agreementSrc = url;
                const lower = (url || '').toLowerCase();
                this.agreementIsPdf = /\.pdf(\b|$)/i.test(url) || /^data:application\/pdf/i.test(url);
                this.agreementIsPng = lower.includes('.png');
            }

            // ID card (front/back with common key variations)
            const idFront = ( u?.cnic ) as string;
            if (idFront) this.idCardFrontSrc = this.toAbsoluteUrl(idFront);
        } catch {}
    }
}

