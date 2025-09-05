import { Injectable } from '@angular/core';
import { StaffService } from './staff.service';
import { Observable } from 'rxjs';
// import { AddManagePayload } from 'src/app/interfaces/staff.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductService extends StaffService {
  addCategory(payload: {category: string}): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'addCategory', payload);
  } 
  addProduct(payload: any): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'addProduct', payload);
  } 
  getAllCategories(): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'getAllCategories');
  }
  deleteCategory(idOrName: string | number): Observable<any> {
    // Assuming backend accepts DELETE /deleteCategory/{id}
    return this.http.delete<any>(this.baseUrl + 'deleteCategory/' + idOrName);
  }
}
