import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
    templateUrl: './user-account-settings.html',
})
export class UserAccountSettingsComponent {
    constructor() {
          this.loadUserFromLocalStorage()
      }
      userName: string | null = null;
      userEmail: string | null = null;
      userRole: string | null = null;
      userPhone: string | null = null;
      userImageSrc: string = '/assets/images/user-profile.jpeg';
      userInitials: string = 'US';
      private pendingImageDataUrl: string | null = null;
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
          // Allow data URLs to pass through unchanged for previews and storage
          if (/^data:/i.test(p)) return p;
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
  
              
          } catch {}
      }

      // Handle image file selection -> preview as data URL immediately
      onImageSelected(event: Event) {
          const input = event.target as HTMLInputElement;
          const file = input?.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
              const result = reader.result as string;
              this.pendingImageDataUrl = result;
              this.userImageSrc = result; // live preview
          };
          reader.readAsDataURL(file);
      }

      // Save updated fields back to localStorage (including selected image)
      saveChanges(name: string, role: string, phone: string, email: string) {
          // Normalize values
          this.userName = (name || '').trim() || null;
          this.userRole = (role || '').trim() || null;
          this.userPhone = (phone || '').trim() || null;
          this.userEmail = (email || '').trim() || null;
          this.userInitials = this.computeInitials(this.userName || '');

          try {
              const raw = localStorage.getItem('auth');
              const u = raw ? JSON.parse(raw) : {};
              if (this.userName !== null) u.name = this.userName; else delete u.name;
              if (this.userRole !== null) u.role = this.userRole; else delete u.role;
              if (this.userPhone !== null) u.phone = this.userPhone; else delete u.phone;
              if (this.userEmail !== null) u.email = this.userEmail; else delete u.email;

              // If a new image was selected, store as data URL in `image`.
              if (this.pendingImageDataUrl) {
                  u.image = this.pendingImageDataUrl;
                  this.pendingImageDataUrl = null;
              }

              localStorage.setItem('auth', JSON.stringify(u));

              // Ensure our displayed image uses correct resolver for next load
              const img = (u?.image ?? '') || '';
              this.userImageSrc = img ? this.toAbsoluteUrl(img) : this.userImageSrc;
          } catch {
              // no-op; avoid crashing on malformed auth
          }
      }

}

