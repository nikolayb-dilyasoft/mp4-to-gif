import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.css']
})
export class ResultComponent implements OnInit {
  jobId: string | null = null;
  gifUrl: SafeUrl | null = null;
  error: string | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.jobId = this.route.snapshot.paramMap.get('jobId');
    if (!this.jobId) {
      this.error = 'No job ID provided';
      this.isLoading = false;
      return;
    }

    this.loadGif();
  }

  private async loadGif(): Promise<void> {
    try {
      const blob = await this.apiService.getGif(this.jobId!).toPromise();
      if (blob) {
        const url = URL.createObjectURL(blob);
        this.gifUrl = this.sanitizer.bypassSecurityTrustUrl(url);
      } else {
        throw new Error('Failed to load GIF: No data received');
      }
    } catch (err: any) {
      this.error = err.message || 'Failed to load GIF. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  downloadGif(): void {
    if (this.gifUrl) {
      const link = document.createElement('a');
      link.href = this.gifUrl as string;
      link.download = `converted-${this.jobId}.gif`;
      link.click();
    }
  }

  convertAnother(): void {
    this.router.navigate(['/']);
  }
}
