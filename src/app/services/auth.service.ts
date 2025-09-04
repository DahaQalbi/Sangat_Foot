import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Role } from 'src/app/enums/role.enum';
import { LoginCredentials } from 'src/app/interfaces/auth.interface';

// LoginCredentials interface is defined in src/app/interfaces/auth.interface.ts

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // POST https://thecodingverse.com/sangatfood/public/login
  login(credentials: LoginCredentials): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'login', credentials);
  }
}

