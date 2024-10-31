import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.css']
})
export class StatusComponent implements OnInit, OnDestroy {
  jobId: string | null = null;
  status: string | null = null;
  error: string | null = null;
  private statusSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    this.jobId = this.route.snapshot.paramMap.get('jobId');
    if (!this.jobId) {
      this.error = 'No job ID provided';
      return;
    }

    // Poll for status every 2 seconds
    this.statusSubscription = interval(2000)
      .pipe(
        switchMap(() => this.apiService.getJobStatus(this.jobId!))
      )
      .subscribe({
        next: (response) => {
          this.status = response.status;
          if (this.status === 'completed') {
            this.router.navigate(['/result', this.jobId]);
          } else if (this.status === 'failed') {
            this.error = 'Conversion failed. Please try again.';
            this.stopPolling();
          }
        },
        error: (err) => {
          this.error = 'Failed to get status. Please try again.';
          this.stopPolling();
        }
      });
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private stopPolling(): void {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = null;
    }
  }

  retry(): void {
    this.router.navigate(['/']);
  }
}
