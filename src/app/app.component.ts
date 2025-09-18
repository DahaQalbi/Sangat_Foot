import { Component, inject, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { IdbService } from './services/idb.service';
import { StaffService } from './services/staff.service';
import { ToastService } from './services/toast.service';
import { ProductService } from './services/product.service';
import { OrderService } from './services/order.service';
import { Base64ConvertionService } from './services/base64-convertion.service';
import { environment } from 'src/environments/environment';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent  {
   private idb:IdbService = inject(IdbService);
   private interval:any;
   private base64ConvertionService:Base64ConvertionService = inject(Base64ConvertionService);
   private userApiCall:StaffService = inject(StaffService);
   private apiProductCall:ProductService = inject(ProductService);
   private apiOrderCall:OrderService = inject(OrderService);
   private apiCategoryCall:ProductService = inject(ProductService);
    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute,
             private toast: ToastService,
        private titleService: Title,
    ) {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                map(() => this.activatedRoute),
                map((route) => {
                    while (route.firstChild) route = route.firstChild;
                    return route;
                }),
                filter((route) => route.outlet === 'primary'),
                switchMap((route) => {
                    return route.data.pipe(
                        map((routeData: any) => {
                            const title = routeData['title'];
                            return { title };
                        }),
                    );
                }),
                tap((data: any) => {
                    let title = data.title;
                    title = (title ? title + ' | ' : '') + 'VRISTO - Multipurpose Tailwind Dashboard Template';
                    this.titleService.setTitle(title);
                }),
            )
            .subscribe();
           this.syncData()
    }
    private async syncData():Promise<void>{
      this.interval = setInterval(() => {
        this.getAllDb()
      }, 10000);
    }
  private async getAllDb():Promise<void>{
    console.log('Syncing data...')
    const raw = localStorage.getItem('auth');
    if (!raw) return;
    const u = await JSON.parse(raw);
    if(u.role === 'admin'){
    const userDb:any = await this.idb.getAll("users")
    if(userDb.length === 0){
      this.userApiCall.getManagers().subscribe({
        next: async (list) => {
          const updatedList = await Promise.all(
            list.map(async (item: any) => ({
              ...item,
              isSync: 1,
            }))
          );
          this.idb.putAll('users', updatedList);
        },
        error: (err) => console.log(err),
      });
    } else {
     const unSyncData = userDb.filter((item:any) => item.isSync === 0)  
     if(unSyncData.length > 0){
        unSyncData.forEach((item:any) => {
          this.userApiCall.addManage(item).subscribe({
            next: (list) => {
              this.idb.putOne("users", { ...item, isSync: 1 })  
            },
            error: (err) => {
          this.toast.error(err?.error?.message || 'Failed to sync manager Record')
        }
      })
     })
     }
    }
    const categoryDb = await this.idb.getAll("categories")
    if(categoryDb.length === 0){
      this.apiCategoryCall.getAllCategories().subscribe({
        next: (list) => {
          const updatedList = list.map((item:any) => ({
            ...item,
            isSync: 1
          }));
          this.idb.putAll("categories", updatedList)
        },
        error: (err) => {
          console.log(err)
        }
      })
    } else {
        const unSyncData = categoryDb.filter((item:any) => item.isSync === 0) 
        if(unSyncData.length > 0){
            unSyncData.forEach((item:any) => {
              this.apiCategoryCall.addCategory(item).subscribe({
                next: (list) => {
                  this.idb.putOne("categories", { ...item, isSync: 1 })
                },
                error: (err) => {
              this.toast.error(err?.error?.message || 'Failed to sync category Record')
            }
          })
         })
         }
    }
    const productDb = await this.idb.getAll("products")
    if(productDb.length === 0){
      this.apiProductCall.getAllProducts().subscribe({
        next: (list) => {
          const updatedList = list.products.map((item:any) => ({
            ...item,
            isSync: 1
          }));
          this.idb.putAll("products", updatedList)
        },
        error: (err) => {
          console.log(err)
        }
      })
    } else {
        const unSyncData = productDb.filter((item:any) => item.isSync === 0) 
        if(unSyncData.length > 0){
            unSyncData.forEach((item:any) => {
              this.apiProductCall.addProduct(item).subscribe({
                next: (list) => {
                  this.idb.putOne("products", { ...item, isSync: 1 })
                },
                error: (err) => {
              this.toast.error(err?.error?.message || 'Failed to sync product Record')
            }
          })
         })
         }
    }
    const orderDb = await this.idb.getAll("orders")
    if(orderDb.length === 0){
      this.apiOrderCall.getAllOrders().subscribe({
        next: (list) => {
          const orders = list.orders;
          const updatedList = orders.map((item:any) => ({
            ...item,
            isSync: 1
          }));
          this.idb.putAll("orders", updatedList)
        },
        error: (err) => {
          console.log(err)
        }
      })
    } else {
        const unSyncData = orderDb.filter((item:any) => item.isSync === 0) 
        if(unSyncData.length > 0){
            unSyncData.forEach((item:any) => {
              this.apiOrderCall.addOrder(item).subscribe({
                next: (list) => {
                  this.idb.putOne("orders", { ...item, isSync: 1 })
                },
                error: (err) => {
              this.toast.error(err?.error?.message || 'Failed to sync order Record')
            }
          })
         })
         }
    }
    const dealDb = await this.idb.getAll("deal")
    if(dealDb.length === 0){
      this.apiOrderCall.getAllDeals().subscribe({
        next: (list) => {
          const updatedList = list.map((item:any) => ({
            ...item,
            isSync: 1
          }));
          this.idb.putAll("deal", updatedList)
        },
        error: (err) => {
          console.log(err)
        }
      })
    } else {
        const unSyncData = dealDb.filter((item:any) => item.isSync === 0) 
        if(unSyncData.length > 0){
            unSyncData.forEach((item:any) => {
              this.apiOrderCall.addDeal(item).subscribe({
                next: (list) => {
                  this.idb.putOne("deal", { ...item, isSync: 1 })
                },
                error: (err) => {
              this.toast.error(err?.error?.message || 'Failed to sync deal Record')
            }
          })
         })
         }
    }
    
    } else {
      const userDb:any = await this.idb.getAll("users")
      const userJson = await JSON.parse(userDb);
      console.log(userJson,"json")
      if(userJson.length === 0){
        this.userApiCall.getManagerById(u.id).subscribe({
          next: (list) => {
            if(list.length > 0){
              const updatedList = list.map((item:any) => ({
                ...item,
                isSync: 1
              }));
              this.idb.putAll("users", updatedList)
            }
          },
          error: (err) => {
            console.log(err)
          }
        })
      } else {
       const unSyncData = userJson.filter((item:any) => item.isSync === 0)  
       if(unSyncData.length > 0){
          unSyncData.forEach((item:any) => {
            this.userApiCall.addManage(item).subscribe({
              next: (list) => {
                this.idb.putOne("users", { ...item, isSync: 1 })  
              },
              error: (err) => {
            this.toast.error(err?.error?.message || 'Failed to sync manager Record')
          }
        })
       })
       }
      }
      const categoryDb = await this.idb.getAll("categories")
      if(categoryDb.length === 0){
        this.apiCategoryCall.getAllCategories().subscribe({
          next: (list) => {
            if(list.length > 0){
              const updatedList = list.map((item:any) => ({
                ...item,
                isSync: 1
              }));
              this.idb.putAll("categories", updatedList)
            }
          },
          error: (err) => {
            console.log(err)
          }
        })
      } else {
          const unSyncData = categoryDb.filter((item:any) => item.isSync === 0) 
          if(unSyncData.length > 0){
              unSyncData.forEach((item:any) => {
                this.apiCategoryCall.addCategory(item).subscribe({
                  next: (list) => {
                    this.idb.putOne("categories", { ...item, isSync: 1 })
                  },
                  error: (err) => {
                this.toast.error(err?.error?.message || 'Failed to sync category Record')
              }
            })
           })
           }
      }
      const productDb = await this.idb.getAll("products")
      if(productDb.length === 0){
        this.apiProductCall.getAllProducts().subscribe({
          next: (list) => {
            if(list.length > 0){
              const updatedList = list.products.map((item:any) => ({
                ...item,
                isSync: 1
              }));
              this.idb.putAll("products", updatedList)
            }
          },
          error: (err) => {
            console.log(err)
          }
        })
      } else {
          const unSyncData = productDb.filter((item:any) => item.isSync === 0) 
          if(unSyncData.length > 0){
              unSyncData.forEach((item:any) => {
                this.apiProductCall.addProduct(item).subscribe({
                  next: (list) => {
                    this.idb.putOne("products", { ...item, isSync: 1 })
                  },
                  error: (err) => {
                this.toast.error(err?.error?.message || 'Failed to sync product Record')
              }
            })
           })
           }
      }
      const orderDb = await this.idb.getAll("orders")
      if(orderDb.length === 0){
        this.apiOrderCall.getOrderById(u.id).subscribe({
          next: (list) => {
            if(list.length > 0){
              const updatedList = list.map((item:any) => ({
                ...item,
                isSync: 1
              }));
              this.idb.putAll("orders", updatedList)
            }
          },
          error: (err) => {
            console.log(err)
          }
        })
      } else {
          const unSyncData = orderDb.filter((item:any) => item.isSync === 0) 
          if(unSyncData.length > 0){
              unSyncData.forEach((item:any) => {
                this.apiOrderCall.addOrder(item).subscribe({
                  next: (list) => {

                    this.idb.putOne("orders", { ...item, isSync: 1 })

                  },
                  error: (err) => {
                this.toast.error(err?.error?.message || 'Failed to sync order Record')
              }
            })
           })
           }
      }
      const dealDb = await this.idb.getAll("deal")
      if(dealDb.length === 0){
        this.apiOrderCall.getAllDeals().subscribe({
          next: (list) => {
            if(list.length > 0){
              const updatedList = list.map((item:any) => ({
                ...item,
                isSync: 1
              }));
              this.idb.putAll("deal", updatedList)
            }
          },
          error: (err) => {
            console.log(err)
          }
        })
      } else {
          const unSyncData = dealDb.filter((item:any) => item.isSync === 0) 
          if(unSyncData.length > 0){
              unSyncData.forEach((item:any) => {
                this.apiOrderCall.addDeal(item).subscribe({
                  next: (list) => {
                    this.idb.putOne("deal", { ...item, isSync: 1 })
                  },
                  error: (err) => {
                this.toast.error(err?.error?.message || 'Failed to sync deal Record')
              }
            })
           })
           }
      }
    }
  }

}
