import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddSectionModal } from '../add-section-modal/add-section-modal';
import { Canvas } from '../canvas/canvas';
import { EditorPanel } from '../editor-panel/editor-panel';
import { EbookStore } from '../store';

/**
 * Add Activity -> Ebook.  Design-only for now: nothing is saved to the backend yet.
 * Route: /admin-dashboard/courses/:courseId/sections/:sectionId/ebook
 * (header + breadcrumb come from the admin-dashboard shell).
 */
@Component({
  selector: 'app-ebook-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './ebook-editor.css',
  imports: [EditorPanel, Canvas, AddSectionModal],
  providers: [EbookStore],
  host: { class: 'block' },
  templateUrl: './ebook-editor.html',
})
export class EbookEditor {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Back to Organize Modules of the same course (same target as the breadcrumb). */
  back(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    void this.router.navigate(['/admin-dashboard', 'courses'], {
      queryParams: courseId ? { organize: courseId } : undefined,
    });
  }
}
