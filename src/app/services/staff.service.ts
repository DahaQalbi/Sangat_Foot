import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AddManagePayload, ManagerItem } from 'src/app/interfaces/staff.interface';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Payload for creating a manager/staff account
  addManage(payload: AddManagePayload): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'addManager', payload);
  }

  // Fetch all managers
  getManagers(): Observable<ManagerItem[]> {
    return this.http.get<ManagerItem[]>(this.baseUrl + 'allManager');
  }

  // Fetch all waiters
  getWaiters(): Observable<ManagerItem[]> {
    return this.http.get<ManagerItem[]>(this.baseUrl + 'allWaiters');
  }
}
