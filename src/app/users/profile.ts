import { Component } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';

@Component({
    templateUrl: './profile.html',
    animations: [toggleAnimation],
})
export class ProfileComponent {
    constructor() {}
}
