import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';

// service
import { AppService } from 'src/app/service/app.service';

// i18n
import { TranslateModule } from '@ngx-translate/core';

// perfect-scrollbar
import { NgScrollbarModule, provideScrollbarOptions } from 'ngx-scrollbar';

// datatable
import { DataTableModule } from '@bhplugin/ng-datatable';

// apexchart
import { NgApexchartsModule } from 'ng-apexcharts';

// highlightjs
import { HighlightModule, provideHighlightOptions } from 'ngx-highlightjs';

// tippy
import { NgxTippyModule } from 'ngx-tippy-wrapper';

// headlessui
import { MenuModule } from 'headlessui-angular';

// sortable
import { SortablejsModule } from '@dustfoundation/ngx-sortablejs';

// quill editor
import { QuillModule } from 'ngx-quill';

// icons
import { IconModule } from 'src/app/shared/icon/icon.module';

// modal
import { NgxCustomModalComponent } from 'ngx-custom-modal';

// fullcalendar
import { FullCalendarModule } from '@fullcalendar/angular';

// counter
import { CountUpModule } from 'ngx-countup';

// lightbox
import { LightboxModule } from 'ngx-lightbox';

// select
import { NgSelectModule } from '@ng-select/ng-select';

// input mask
import { TextMaskModule } from '@matheo/text-mask';

// nouilsider
import { NouisliderModule } from 'ng2-nouislider';

// flatpicker
import { FlatpickrModule } from 'angularx-flatpickr';

// clipboard
import { ClipboardModule } from 'ngx-clipboard';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,

        TranslateModule.forChild(),
        NgScrollbarModule,
        DataTableModule,
        MenuModule,
        NgxTippyModule,
        NgApexchartsModule,
        HighlightModule,
        SortablejsModule,
        QuillModule.forRoot(),
        IconModule,
        NgxCustomModalComponent,
        FullCalendarModule,
        CountUpModule,
        LightboxModule,
        NgSelectModule,
        TextMaskModule,
        NouisliderModule,
        FlatpickrModule.forRoot(),
        ClipboardModule,
    ],
    declarations: [],
    exports: [
        // modules
        FormsModule,
        ReactiveFormsModule,

        TranslateModule,
        NgScrollbarModule,
        DataTableModule,
        MenuModule,
        NgxTippyModule,
        NgApexchartsModule,
        HighlightModule,
        SortablejsModule,
        QuillModule,
        IconModule,
        NgxCustomModalComponent,
        FullCalendarModule,
        CountUpModule,
        LightboxModule,
        NgSelectModule,
        TextMaskModule,
        NouisliderModule,
        FlatpickrModule,
        ClipboardModule,
    ],
})
export class SharedModule {
    static forRoot(): ModuleWithProviders<any> {
        return {
            ngModule: SharedModule,
            providers: [
                Title,
                AppService,
                provideScrollbarOptions({
                    visibility: 'hover',
                    appearance: 'compact',
                }),
                provideHighlightOptions({
                    coreLibraryLoader: () => import('highlight.js/lib/core'),
                    languages: {
                        json: () => import('highlight.js/lib/languages/json'),
                        typescript: () => import('highlight.js/lib/languages/typescript'),
                        xml: () => import('highlight.js/lib/languages/xml'),
                    },
                }),
            ],
        };
    }
}
