import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AddManagePayload, DeleteRecordPayload, ManagerItem, UpdateManagerPayload } from 'src/app/interfaces/staff.interface';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  public baseUrl = environment.apiUrl;

  constructor(public http: HttpClient) {}

  // Payload for creating a manager/staff account
  addManage(payload: AddManagePayload): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'addManager', payload);
  }

  // Fetch all managers
  getManagers(): Observable<ManagerItem[]> {
    return this.http.get<ManagerItem[]>(this.baseUrl + 'allManager');
  }
  updateManager(payload: UpdateManagerPayload): Observable<any> {
    return this.http.put<any>(this.baseUrl + 'updateManager', payload);
  }
  deleteRecord(payload: DeleteRecordPayload): Observable<any> {
    return this.http.put<any>(this.baseUrl + 'deleteRecord', payload);
  }
  deleteManager(id: string): Observable<any> {
    return this.http.delete<any>(this.baseUrl + `deleteManager/${id}`);
  }
  getManagerById(id: string): Observable<any> {
    return this.http.get<any>(this.baseUrl + `getManagerById/${id}`);
  }
  // Fetch all waiters

}
