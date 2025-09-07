import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { StorageService } from 'src/app/services/storage.service';
import { Role } from 'src/app/enums/role.enum';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private storage: StorageService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    try {
      const auth = (await this.storage.get<any>('auth'))
        ?? JSON.parse(localStorage.getItem('auth') || 'null');
      if (!auth) {
        return this.router.parseUrl('/auth/boxed-signin');
      }
      const role = this.extractRole(auth);
      const allowed: Role[] = route.data?.['roles'] || [];
      if (!allowed.length) return true;
      if (role === Role.Admin) return true; // Admin can do anything
      if (role && allowed.includes(role)) return true;
      // If we have auth but couldn't determine role, block access to protected routes
      if (!role) return this.router.parseUrl('/');
      // Not allowed explicitly: redirect to home
      return this.router.parseUrl('/');
    } catch {
      return this.router.parseUrl('/auth/boxed-signin');
    }
  }

  private extractRole(auth: any): Role | null {
    const pickString = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toLowerCase();
    const candidates: string[] = [
      pickString(auth?.role),
      pickString(auth?.user?.role),
      pickString(auth?.data?.role),
      // when payload is array under data
      Array.isArray(auth?.data) ? pickString(auth?.data?.[0]?.role) : '',
      pickString(auth?.user?.role?.name),
      pickString(Array.isArray(auth?.user?.roles) ? auth.user.roles[0] : ''),
      pickString(auth?.data?.user?.role),
      pickString(auth?.data?.user?.role?.name),
      pickString(auth?.user?.type),
      pickString(auth?.data?.user?.type),
    ].filter(Boolean);
    for (const raw of candidates) {
      if (raw === 'admin') return Role.Admin;
      if (raw === 'manager') return Role.Manager;
      if (raw === 'waiter') return Role.Waiter;
    }
    if (Array.isArray(auth?.user?.roles)) {
      for (const r of auth.user.roles) {
        const name = pickString(r?.name ?? r);
        if (name === 'admin') return Role.Admin;
        if (name === 'manager') return Role.Manager;
        if (name === 'waiter') return Role.Waiter;
      }
    }
    return null;
  }
}
