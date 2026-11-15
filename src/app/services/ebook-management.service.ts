import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../course-module/course.model';
import { EbookRecord, EbookSummary } from '../course-module/ebook/ebook-api.model';

/** Ebooks of a course section (Add Activity -> Ebook). Create / edit / delete need the Ebook permission; reading is open to learners. */
@Injectable({ providedIn: 'root' })
export class EbookManagementService {
  private readonly http = inject(HttpClient);

  private url(courseId: number, sectionId: number): string {
    return `${environment.apiBaseUrl}/api/courses/${courseId}/sections/${sectionId}/ebooks`;
  }

  /** Names only - no content. */
  list(courseId: number, sectionId: number): Observable<EbookSummary[]> {
    return this.http
      .get<ApiResponse<EbookSummary[]>>(this.url(courseId, sectionId))
      .pipe(map((res) => res.data ?? []));
  }

  get(courseId: number, sectionId: number, ebookId: number): Observable<EbookRecord> {
    return this.http
      .get<ApiResponse<EbookRecord>>(`${this.url(courseId, sectionId)}/${ebookId}`)
      .pipe(map((res) => res.data));
  }

  create(courseId: number, sectionId: number, name: string, content: string): Observable<EbookRecord> {
    return this.http
      .post<ApiResponse<EbookRecord>>(this.url(courseId, sectionId), { name, content })
      .pipe(map((res) => res.data));
  }

  update(courseId: number, sectionId: number, ebookId: number, name: string, content: string): Observable<EbookRecord> {
    return this.http
      .put<ApiResponse<EbookRecord>>(`${this.url(courseId, sectionId)}/${ebookId}`, { name, content })
      .pipe(map((res) => res.data));
  }

  delete(courseId: number, sectionId: number, ebookId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.url(courseId, sectionId)}/${ebookId}`)
      .pipe(map(() => undefined));
  }
}