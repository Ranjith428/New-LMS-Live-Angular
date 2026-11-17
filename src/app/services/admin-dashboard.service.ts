import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';

/** Query value of GET /api/dashboard/admin?period=... */
export type DashboardPeriod = 'WEEK' | 'MONTH' | 'YEAR';

/** One chart series: labels[i] <-> values[i]; total = sum of values. */
export interface DashboardSeries {
  labels: string[];
  values: number[];
  total: number;
}

export interface UserDistribution {
  admins: number;
  instructors: number;
  learners: number;
}

/** Shape of AdminDashboardDto.Response on the backend. */
export interface AdminDashboardData {
  period: DashboardPeriod;
  logins: DashboardSeries;
  newSignups: DashboardSeries;
  revenue: DashboardSeries;
  userDistribution: UserDistribution;
  /** 0-100 */
  courseCompletionRate: number;
  onlineUsers: number;
  /** Ready-to-show text, e.g. "2d 4h". */
  averageLearningTime: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/dashboard/admin`;

  /** Numbers of the caller's own organization (the backend scopes by the logged-in user). */
  getAdminDashboard(period: DashboardPeriod): Observable<AdminDashboardData> {
    return this.http
      .get<ApiResponse<AdminDashboardData>>(this.url, { params: new HttpParams().set('period', period) })
      .pipe(map(({ data }) => data));
  }
}