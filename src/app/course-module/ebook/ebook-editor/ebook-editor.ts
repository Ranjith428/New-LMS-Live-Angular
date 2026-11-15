import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EbookManagementService } from '../../../services/ebook-management.service';
import { EBOOK_MAX_CONTENT_CHARS, EBOOK_NAME_MAX, EBOOK_NAME_MIN } from '../ebook-api.model';
import { Section } from '../models';
import { AddSectionModal } from '../add-section-modal/add-section-modal';
import { Canvas } from '../canvas/canvas';
import { EditorPanel } from '../editor-panel/editor-panel';
import { EbookStore } from '../store';

/** Minimum page height (px) before the page itself is allowed to scroll on very small screens (same as Organize Modules). */
const MIN_PAGE_HEIGHT = 520;

/**
 * Add Activity -> Ebook. The ebook is saved to the backend with the name the instructor types.
 * Routes (header + breadcrumb come from the admin-dashboard shell):
 *  - /admin-dashboard/courses/:courseId/sections/:sectionId/ebook             -> a new ebook
 *  - /admin-dashboard/courses/:courseId/sections/:sectionId/ebook/:ebookId    -> edit a saved ebook
 *
 * A new ebook opens blank ("Start from scratch") or with the sections of an uploaded document (see EbookStore).
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
  private readonly store = inject(EbookStore);
  private readonly api = inject(EbookManagementService);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  private readonly courseId = Number(this.route.snapshot.paramMap.get('courseId'));
  private readonly sectionId = Number(this.route.snapshot.paramMap.get('sectionId'));
  /** null = not saved yet (a new ebook). */
  private ebookId: number | null = Number(this.route.snapshot.paramMap.get('ebookId')) || null;

  protected readonly nameMax = EBOOK_NAME_MAX;
  protected readonly name = signal('');
  protected readonly nameError = signal<string | null>(null);
  /** Loading a saved ebook to edit it. */
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly notice = signal<{ type: 'ok' | 'error'; text: string } | null>(null);

  /** Height that fills the admin content area exactly (null until measured). */
  protected readonly fitHeight = signal<number | null>(null);

  constructor() {
    if (this.ebookId) this.loadEbook(this.ebookId);
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

  // ---------- load / save ----------

  /** Editing a saved ebook: fetch its name and pages. */
  protected loadEbook(ebookId: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .get(this.courseId, this.sectionId, ebookId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ebook) => {
          try {
            const sections = JSON.parse(ebook.content) as Section[];
            if (!Array.isArray(sections)) throw new Error('not an array');
            this.store.sections.set(sections);
            this.name.set(ebook.name);
            this.loading.set(false);
          } catch {
            this.loading.set(false);
            this.loadError.set('This ebook could not be opened because its content is damaged.');
          }
        },
        error: (error) => {
          this.loading.set(false);
          this.loadError.set(this.messageOf(error, 'The ebook could not be loaded.'));
        },
      });
  }

  protected onName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.nameError.set(null);
    this.notice.set(null);
  }

  /** Same rule as the backend: required, 4 to 100 characters. */
  private validateName(): string | null {
    const value = this.name().trim().replace(/\s+/g, ' ');
    if (!value) return 'Ebook Name is required.';
    if (value.length < EBOOK_NAME_MIN) return `Minimum ${EBOOK_NAME_MIN} characters.`;
    if (value.length > EBOOK_NAME_MAX) return `Maximum ${EBOOK_NAME_MAX} characters.`;
    return null;
  }

  /** Save button: creates the ebook the first time, updates it afterwards. */
  protected save(): void {
    if (this.saving() || this.loading()) return;
    this.notice.set(null);

    const nameError = this.validateName();
    this.nameError.set(nameError);
    if (nameError) return;
    if (this.store.sections().length === 0) {
      this.notice.set({ type: 'error', text: 'Add at least one section before saving.' });
      return;
    }
    const content = JSON.stringify(this.store.sections());
    if (content.length > EBOOK_MAX_CONTENT_CHARS) {
      this.notice.set({ type: 'error', text: 'The ebook is too large (maximum 25 MB). Use smaller images.' });
      return;
    }

    const name = this.name().trim().replace(/\s+/g, ' ');
    this.saving.set(true);
    const request =
      this.ebookId === null
        ? this.api.create(this.courseId, this.sectionId, name, content)
        : this.api.update(this.courseId, this.sectionId, this.ebookId, name, content);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.name.set(saved.name);
        if (this.ebookId === null) {
          // from now on Save updates this ebook, and a refresh reopens it (no new route / reload needed)
          this.ebookId = saved.id;
          this.location.replaceState(
            `/admin-dashboard/courses/${this.courseId}/sections/${this.sectionId}/ebook/${saved.id}`,
          );
        }
        this.notice.set({ type: 'ok', text: 'Ebook saved successfully.' });
      },
      error: (error) => {
        this.saving.set(false);
        const message = this.messageOf(error, 'The ebook could not be saved. Please try again.');
        // a name problem belongs under the name field
        if (error?.status === 409 || /name/i.test(message)) this.nameError.set(message);
        else this.notice.set({ type: 'error', text: message });
      },
    });
  }

  private messageOf(error: { error?: { message?: string }; status?: number } | undefined, fallback: string): string {
    if (error?.status === 413) return 'The ebook is too large. Use smaller images.';
    return error?.error?.message || fallback;
  }

  /** Back to Organize Modules of the same course (same target as the breadcrumb). */
  back(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    void this.router.navigate(['/admin-dashboard', 'courses'], {
      queryParams: courseId ? { organize: courseId } : undefined,
    });
  }
}