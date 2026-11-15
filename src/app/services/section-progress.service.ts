import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../course-module/course.model';

export type SectionProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

/** Progress of one course section (module): average of its items. Drives the rings on Course Preview. */
export interface SectionProgressItem {
  sectionId: number;
  status: SectionProgressStatus;
  /** 0-100 */
  percent: number;
  /** The previous module is not completed yet, so this one can't be opened. */
  locked: boolean;
}

/** One content item of a section: a multimedia file or the quiz. */
export interface ContentItemProgress {
  sectionId: number;
  itemType: 'MULTIMEDIA' | 'QUIZ';
  /** Multimedia id, or the question bank id for QUIZ. */
  itemId: number;
  name: string;
  /** 0-100; 100 = completed (quiz: submitted). */
  percent: number;
}

/** tracked = false for admins / instructors (no rings, no locks); true for an enrolled learner. */
export interface CourseProgress {
  tracked: boolean;
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  sections: SectionProgressItem[];
  items: ContentItemProgress[];
}

/** Learner progress: rings on Course Preview, per-item completion and the quiz lock on the content page. */
@Injectable({ providedIn: 'root' })
export class SectionProgressService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/courses`;

  getProgress(courseId: number): Observable<CourseProgress> {
    return this.http
      .get<ApiResponse<CourseProgress>>(`${this.baseUrl}/${courseId}/progress`)
      .pipe(map((res) => res.data));
  }

  /** The learner has got `percent` % through one multimedia item (100 = completed). The server only ever raises it. */
  updateItem(courseId: number, sectionId: number, itemId: number, percent: number): Observable<CourseProgress> {
    return this.http
      .post<ApiResponse<CourseProgress>>(
        `${this.baseUrl}/${courseId}/sections/${sectionId}/items/multimedia/${itemId}/progress`,
        { percent },
      )
      .pipe(map((res) => res.data));
  }
}