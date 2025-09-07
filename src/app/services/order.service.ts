import { Injectable } from '@angular/core';
import { ProductService } from './product.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService extends ProductService   {

  addOrder(payload: any): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'addOrder', payload);
  } 
  deleteOrder(id: any): Observable<any> {
    return this.http.delete<any>(this.baseUrl + `deleteOrder/${id}`);
  } 
  addDeal(payload: any): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'addDeal', payload);
  } 
  deleteDeal(id: any): Observable<any> {
    return this.http.delete<any>(this.baseUrl + `deleteDeal/${id}`);
  } 
  getAllDeals(): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'deals');
  } 
  getAllOrders(): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'getAllOrders');
  } 
  updateOrderStatus(id: any, status: string): Observable<any> {
    return this.http.put<any>(this.baseUrl + 'updateOrderStatus', { id, status });
  } 
}
