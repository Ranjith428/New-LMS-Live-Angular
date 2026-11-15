import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddSectionModal } from '../add-section-modal/add-section-modal';
import { Canvas } from '../canvas/canvas';
import { EditorPanel } from '../editor-panel/editor-panel';
import { EbookStore } from '../store';

/** Minimum page height (px) before the page itself is allowed to scroll on very small screens (same as Organize Modules). */
const MIN_PAGE_HEIGHT = 520;

/**
 * Add Activity -> Ebook.  Design-only for now: nothing is saved to the backend yet.
 * Route: /admin-dashboard/courses/:courseId/sections/:sectionId/ebook
 * (header + breadcrumb come from the admin-dashboard shell).
 *
 * Opens blank ("Start from scratch") or with the sections of an uploaded document (see EbookStore).
 */
@Component({
  selector: 'app-ebook-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './ebook-editor.css',
  imports: [EditorPanel, Canvas, AddSectionModal],
  providers: [EbookStore],
  host: { class: 'block', '(window:resize)': 'updateFit()' },
  templateUrl: './ebook-editor.html',
})
export class EbookEditor {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Height that fills the admin content area exactly (null until measured). */
  protected readonly fitHeight = signal<number | null>(null);

  constructor() {
    afterNextRender(() => {
      this.updateFit();
      setTimeout(() => this.updateFit(), 200); // second pass once fonts / layout have settled
    });
  }

  /** Same fitting as Organize Modules, so the editor sits in the dashboard with identical padding. */
  protected updateFit(): void {
    const top = this.host.nativeElement.getBoundingClientRect().top + window.scrollY;
    const available = window.innerHeight - top - this.ancestorsBottomSpace() - 1;
    this.fitHeight.set(Math.max(MIN_PAGE_HEIGHT, Math.floor(available)));
  }

  /** Bottom padding / margin / border of every ancestor, so the page never overflows the viewport. */
  private ancestorsBottomSpace(): number {
    let total = 0;
    let el: HTMLElement | null = this.host.nativeElement.parentElement;
    while (el) {
      const cs = getComputedStyle(el);
      total +=
        (parseFloat(cs.paddingBottom) || 0) +
        (parseFloat(cs.marginBottom) || 0) +
        (parseFloat(cs.borderBottomWidth) || 0);
      el = el.parentElement;
    }
    return total;
  }

  /** Back to Organize Modules of the same course (same target as the breadcrumb). */
  back(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    void this.router.navigate(['/admin-dashboard', 'courses'], {
      queryParams: courseId ? { organize: courseId } : undefined,
    });
  }
}
