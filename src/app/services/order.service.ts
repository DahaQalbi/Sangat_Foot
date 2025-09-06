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
  addDeal(payload: any): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'addDeal', payload);
  } 
  getAllOrders(): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'getAllOrders');
  } 
  updateOrderStatus(orderId: any, status: string): Observable<any> {
    return this.http.put<any>(this.baseUrl + 'updateOrderStatus', { orderId, status });
  } 
}
