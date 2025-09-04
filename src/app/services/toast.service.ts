import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertPosition } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly baseOptions = {
    toast: true,
    position: 'top-end' as SweetAlertPosition,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#1f2937', // dark gray
    color: '#ffffff', // white text
    customClass: { popup: 'rounded-md shadow-lg' },
  };

  success(title: string, opts: Partial<typeof this.baseOptions> = {}) {
    return Swal.fire({
      ...this.baseOptions,
      icon: 'success',
      title,
      ...opts,
    });
  }

  error(title: string, opts: Partial<typeof this.baseOptions> = {}) {
    return Swal.fire({
      ...this.baseOptions,
      icon: 'error',
      title,
      ...opts,
    });
  }

  info(title: string, opts: Partial<typeof this.baseOptions> = {}) {
    return Swal.fire({
      ...this.baseOptions,
      icon: 'info',
      title,
      ...opts,
    });
  }

  warning(title: string, opts: Partial<typeof this.baseOptions> = {}) {
    return Swal.fire({
      ...this.baseOptions,
      icon: 'warning',
      title,
      ...opts,
    });
  }
}
