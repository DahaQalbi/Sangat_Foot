import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Role } from 'src/app/enums/role.enum';
import { LoginCredentials } from 'src/app/interfaces/auth.interface';
import { StorageService } from './storage.service';

// LoginCredentials interface is defined in src/app/interfaces/auth.interface.ts

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private storage: StorageService) {}

  // POST https://thecodingverse.com/sangatfood/public/login
  login(credentials: LoginCredentials): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'login', credentials);
  }

  // Clear all auth-related data and local storage
  async logout(): Promise<void> {
    try {
      await this.storage.clear();
    } catch {}
    try {
      localStorage.clear();
      sessionStorage?.clear?.();
    } catch {}
  }
}

