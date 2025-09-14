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
  updateCategoryOrder(payload: any): Observable<any> {
    return this.http.put<any>(this.baseUrl + 'updateCategoryOrder', payload);
  } 
  getAllCategories(): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'getAllCategories');
  }
  getAllProducts(): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'getAllProducts');
  }
  updateProduct(payload: any): Observable<any> {
    return this.http.put<any>(this.baseUrl + 'updateProduct', payload);
  }
  deleteCategory(idOrName: string | number): Observable<any> {
    return this.http.delete<any>(this.baseUrl + 'deleteCategory/' + idOrName);
  }
  deleteProduct(id: number): Observable<any> {
    return this.http.delete<any>(this.baseUrl + 'deleteProduct/' + id);
  }
}
