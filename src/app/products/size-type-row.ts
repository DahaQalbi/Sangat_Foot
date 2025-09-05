import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-size-type-row',
  templateUrl: './size-type-row.html',
})
export class SizeTypeRowComponent {
  @Input() group!: FormGroup;
  @Input() index = 0;
  @Output() remove = new EventEmitter<void>();

  onRemove() {
    this.remove.emit();
  }
}
