import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { UploadComponent } from './upload/upload.component';
import { StatusComponent } from './status/status.component';
import { ResultComponent } from './result/result.component';
import { ApiService } from './services/api.service';

@NgModule({
  declarations: [
    AppComponent,
    UploadComponent,
    StatusComponent,
    ResultComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    RouterModule.forRoot([
      { path: '', component: UploadComponent },
      { path: 'status/:jobId', component: StatusComponent },
      { path: 'result/:jobId', component: ResultComponent },
      { path: '**', redirectTo: '' }
    ])
  ],
  providers: [ApiService],
  bootstrap: [AppComponent]
})
export class AppModule { }
