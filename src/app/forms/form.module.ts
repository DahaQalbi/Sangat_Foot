import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';

import { BasicComponent } from './basic';
import { InputGroupComponent } from './input-group';
import { LayoutsComponent } from './layouts';
import { ValidationComponent } from './validation';
import { InputMaskComponent } from './input-mask';
import { Select2Component } from './select2';
import { CheckboxRadioComponent } from './checkbox-radio';
import { SwitchesComponent } from './switches';
import { WizardsComponent } from './wizards';
import { FileUploadComponent } from './file-upload';
import { QuillEditorComponent } from './quill-editor';
import { DatePickerComponent } from './date-picker';
import { ClipboardComponent } from './clipboard';

const routes: Routes = [
    { path: 'forms/basic', component: BasicComponent, data: { title: 'Forms' } },
    { path: 'forms/input-group', component: InputGroupComponent, data: { title: 'Input Group' } },
    { path: 'forms/layouts', component: LayoutsComponent, data: { title: 'Form Layouts' } },
    { path: 'forms/validation', component: ValidationComponent, data: { title: 'Form Validation' } },
    { path: 'forms/input-mask', component: InputMaskComponent, data: { title: 'Input Mask' } },
    { path: 'forms/select2', component: Select2Component, data: { title: 'Select2' } },
    { path: 'forms/checkbox-radio', component: CheckboxRadioComponent, data: { title: 'Checkbox & Radio' } },
    { path: 'forms/switches', component: SwitchesComponent, data: { title: 'Switches' } },
    { path: 'forms/wizards', component: WizardsComponent, data: { title: 'Wizards' } },
    { path: 'forms/file-upload', component: FileUploadComponent, data: { title: 'File Upload' } },
    { path: 'forms/quill-editor', component: QuillEditorComponent, data: { title: 'Quill Editor' } },
    { path: 'forms/date-picker', component: DatePickerComponent, data: { title: 'Date & Range Picker' } },
    { path: 'forms/clipboard', component: ClipboardComponent, data: { title: 'Clipboard' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        BasicComponent,
        InputGroupComponent,
        LayoutsComponent,
        ValidationComponent,
        InputMaskComponent,
        Select2Component,
        CheckboxRadioComponent,
        SwitchesComponent,
        WizardsComponent,
        FileUploadComponent,
        QuillEditorComponent,
        DatePickerComponent,
        ClipboardComponent,
    ],
    providers: [],
})
export class FormModule {}
