import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
  selectedFile: File | null = null;
  isUploading = false;
  error: string | null = 'Please select a file first.';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Initialize with error message
    this.error = 'Please select a file first.';
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file && file.type === 'video/mp4') {
      this.selectedFile = file;
      this.error = null;
    } else {
      this.error = 'Please select a valid MP4 file.';
      this.selectedFile = null;
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.selectedFile) {
      this.error = 'Please select a file first.';
      return;
    }

    this.isUploading = true;
    this.error = null;

    try {
      const response = await lastValueFrom(this.apiService.uploadFile(this.selectedFile));
      if (response?.jobId) {
        this.router.navigate(['/status', response.jobId]);
      } else {
        throw new Error('No job ID received');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      this.error = err.message || 'Failed to upload file. Please try again.';
    } finally {
      this.isUploading = false;
    }
  }
}
