import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { StorageService } from 'src/app/services/storage.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private storage: StorageService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    try {
      const auth = await this.storage.get('auth');
      if (auth) {
        return true;
      }
    } catch (e) {
      // fall through to redirect
    }
    // Not logged in: redirect to signin
    return this.router.parseUrl('/auth/boxed-signin');
  }
}
