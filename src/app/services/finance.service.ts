import { Injectable } from '@angular/core';
import { StaffService } from './staff.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FinanceService  extends StaffService{
 public  getAllFinance(): Observable<any> {
    return this.http.get<any>(this.baseUrl + 'getFinance');
  } 
}
