import { Component } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from 'src/app/service/app.service';
import { AuthService } from 'src/app/services/auth.service';
import { Role } from 'src/app/enums/role.enum';
import { LoginCredentials } from 'src/app/interfaces/auth.interface';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StorageService } from 'src/app/services/storage.service';
import { ToastService } from 'src/app/services/toast.service';
import { environment } from 'src/environments/environment';

@Component({
    templateUrl: './boxed-signin.html',
    animations: [toggleAnimation],
})
export class BoxedSigninComponent {
    store: any;
    // Reactive form state
    loginForm!: FormGroup;
    roles: Role[] = Object.values(Role);
    submitting = false;
    errorMsg = '';
    // Default and environment logo handling for login page
    readonly defaultLogo = '/assets/images/logo.svg';
    logoSrc: string = (environment.logo && environment.logo.trim()) ? environment.logo : this.defaultLogo;

    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private appSetting: AppService,
        private authService: AuthService,
        private storage: StorageService,
        private toast: ToastService,
        private fb: FormBuilder,
    ) {
        this.initStore();
        this.buildForm();
    }
    onLogoError() {
        if (this.logoSrc !== this.defaultLogo) {
            this.logoSrc = this.defaultLogo;
        }
    }
    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    changeLanguage(item: any) {
        this.translate.use(item.code);
        this.appSetting.toggleLanguage(item);
        if (this.store.locale?.toLowerCase() === 'ae') {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'rtl' });
        } else {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'ltr' });
        }
        window.location.reload();
    }

    onSubmit() {
        this.errorMsg = '';
        if (!this.loginForm || this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }
        const payload: LoginCredentials = this.loginForm.value;
        this.submitting = true;
        this.authService.login(payload).subscribe({
            next: async (res) => {
                this.submitting = false;
                // If backend returns an error flag, do not persist or navigate
                if (res?.error === true) {
                    this.errorMsg = res?.message || 'Login failed. Please check your credentials.';
                    this.toast.error('Please enter valid credentials');
                    return;
                }
                try {
                    await this.storage.set('auth', res);
                } catch (e) {
                    // optional: surface storage error
                    console.error('Failed to persist auth data to IndexedDB', e);
                }
                // Success: notify user
                this.toast.success('Logged in successfully');
                // Navigate to home on success
                this.router.navigate(['/']);
            },
            error: (err) => {
                this.submitting = false;
                this.errorMsg = err?.error?.message || 'Login failed. Please check your credentials.';
                this.toast.error('Please enter valid credentials');
            },
        });
    }

    private buildForm() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required]],
            role: [Role.Admin, [Validators.required]],
        });
    }

}
