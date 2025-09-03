import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';

@Component({
    templateUrl: './modals.html',
})
export class ModalsComponent {
    codeArr: any = [];
    toggleCode = (name: string) => {
        if (this.codeArr.includes(name)) {
            this.codeArr = this.codeArr.filter((d: string) => d != name);
        } else {
            this.codeArr.push(name);
        }
    };
    constructor(public storeData: Store<any>) {
        this.initStore();
    }
    store: any;
    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    tab1: string = 'home';
    swiper1: any;
    items = ['carousel1.jpeg', 'carousel2.jpeg', 'carousel3.jpeg'];

    initSwiper() {
        setTimeout(() => {
            this.swiper1 = new Swiper('#slider1', {
                modules: [Navigation, Pagination],
                navigation: { nextEl: '.swiper-button-next-ex1', prevEl: '.swiper-button-prev-ex1' },
                pagination: {
                    el: '#slider1 .swiper-pagination',
                    type: 'bullets',
                    clickable: true,
                },
            });
        });
    }
}
