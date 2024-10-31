import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private BASE_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  uploadFile(file: File): Observable<{ jobId: string }> {
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<{ jobId: string }>(`${this.BASE_URL}/upload`, formData);
  }

  getJobStatus(jobId: string): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.BASE_URL}/status/${jobId}`);
  }

  getGif(jobId: string): Observable<Blob> {
    return this.http.get(`${this.BASE_URL}/result/${jobId}`, { responseType: 'blob' });
  }
}
