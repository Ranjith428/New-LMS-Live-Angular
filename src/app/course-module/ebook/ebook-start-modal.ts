import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { EBOOK_IMPORT_ACCEPT, EbookImportError, EbookImportService } from './ebook-import';
import { Section } from './models';

/**
 * Add Activity -> Ebook pop-up: "Start from scratch" (blank editor) or "Upload" a document,
 * which is converted to editable sections and opened in the editor.
 */
@Component({
  selector: 'app-ebook-start-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <div
      class="fixed inset-0 z-[75] grid place-items-center bg-black/35 p-4 backdrop-blur-sm"
      (click)="close()"
    >
      <section
        class="w-[min(520px,94vw)] rounded-[20px] bg-white p-7 font-sans shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ebook-start-title"
        aria-describedby="ebook-start-hint"
        (click)="$event.stopPropagation()"
      >
        <h2 id="ebook-start-title" class="text-[19px] font-medium leading-6 text-neutral-700">Ebook</h2>
        <p id="ebook-start-hint" class="mt-1 text-[11px] leading-4 text-neutral-600">
          Start with a blank page, or upload a document and edit it in the ebook editor.
        </p>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            #first
            type="button"
            class="flex h-[120px] flex-col items-center justify-center gap-2 rounded-xl bg-[#f5f5f5] px-4 text-center text-[12px] text-neutral-700 outline-none transition hover:bg-[#e9f5f7] focus-visible:ring-2 focus-visible:ring-[#61b7c5] disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="busy()"
            (click)="startScratch.emit()"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4fb3c4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            <span class="font-medium">Start from scratch</span>
            <span class="text-[10px] text-neutral-600">Open a blank editor</span>
          </button>

          <label
            class="flex h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#67b9c7] px-4 text-center text-[12px] text-neutral-700 transition focus-within:ring-2 focus-within:ring-[#61b7c5]"
            [class]="
              (busy() ? 'cursor-wait opacity-60 ' : 'cursor-pointer ') +
              (dragging() ? 'bg-cyan-50' : 'hover:bg-cyan-50/40')
            "
            (dragover)="onDragOver($event)"
            (dragleave)="dragging.set(false)"
            (drop)="onDrop($event)"
          >
            <input
              type="file"
              class="sr-only"
              [attr.accept]="accept"
              [disabled]="busy()"
              (change)="onFile($event)"
            />
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4fb3c4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 20h16" /></svg>
            <span class="font-medium">{{ busy() ? 'Reading document…' : 'Upload document' }}</span>
            <span class="text-[10px] text-neutral-600">DOCX, TXT, MD or HTML</span>
          </label>
        </div>

        @if (error()) {
          <p class="mt-3 text-[11px] text-red-600" role="alert">{{ error() }}</p>
        }

        <div class="mt-6 flex justify-end">
          <button
            type="button"
            class="h-9 rounded-lg bg-neutral-100 px-4 text-xs text-neutral-700 outline-none transition hover:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-[#61b7c5] disabled:opacity-50"
            [disabled]="busy()"
            (click)="close()"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  `,
})
export class EbookStartModal {
  private readonly importer = inject(EbookImportService);
  private readonly firstButton = viewChild<ElementRef<HTMLButtonElement>>('first');

  readonly closed = output<void>();
  readonly startScratch = output<void>();
  readonly imported = output<Section[]>();

  protected readonly accept = EBOOK_IMPORT_ACCEPT;
  protected readonly busy = signal(false);
  protected readonly dragging = signal(false);
  protected readonly error = signal('');

  constructor() {
    afterNextRender(() => this.firstButton()?.nativeElement.focus());
  }

  protected close(): void {
    if (!this.busy()) this.closed.emit();
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // picking the same file again must fire (change) again
    if (file) void this.importFile(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.busy()) this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && !this.busy()) void this.importFile(file);
  }

  private async importFile(file: File): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      this.imported.emit(await this.importer.parse(file));
    } catch (e) {
      this.error.set(
        e instanceof EbookImportError
          ? e.message
          : 'Unable to read this document. Please try another file.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
