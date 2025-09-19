import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toggleAnimation } from 'src/app/shared/animations';
import { IdbService } from 'src/app/services/idb.service';
import { ToastService } from 'src/app/services/toast.service';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from "uuid";
@Component({
  templateUrl: './add-category.html',
  animations: [toggleAnimation],
})
export class AddCategoryComponent {
  form!: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private toast: ToastService,
    private router: Router,
    private idb: IdbService,
  ) {
    this.buildForm();
  }

  private buildForm() {
    this.form = this.fb.group({
      category: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

const categoryId = uuidv4();
    const { category } = this.form.value;
    this.submitting = true;
    const payload = { id:categoryId, category, isSync: 0 } as any;
    console.log(payload);
    this.idb
      .putAll('categories', [payload])
      .then(() => {
        this.submitting = false;
        this.toast.success('Category saved locally');
        this.form.reset();
        this.router.navigate(['/products/categories']);
      })
      .catch(() => {
        this.submitting = false;
        this.toast.error('Failed to save category locally');
      });
  }
}
