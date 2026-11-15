import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { parseVideoUrl } from '../video-embed';
import { Icon } from './icon';

/**
 * Plays the video of a pasted link (YouTube, Vimeo, ...) on the ebook page.
 * It fills its parent, so the parent decides the size.
 */
@Component({
  selector: 'app-video-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'block size-full' },
  template: `
    @switch (source()?.kind) {
      @case ('iframe') {
        <iframe
          class="size-full border-0 bg-black"
          [class.pointer-events-none]="!interactive()"
          [src]="frameUrl()"
          [title]="title() || 'Embedded video'"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      }
      @case ('file') {
        <video
          class="size-full bg-black"
          [class.pointer-events-none]="!interactive()"
          [src]="source()?.src"
          [attr.aria-label]="title() || 'Video'"
          controls
          preload="metadata"
        ></video>
      }
      @default {
        <div class="flex size-full flex-col items-center justify-center gap-1 bg-[#eaf3f4] px-3 text-center text-[11px] text-[#2f7f92]">
          <app-icon name="video" class="size-[24px]" />
          @if (url().trim()) {
            This video link is not supported
          } @else {
            Paste a YouTube or Vimeo link in the properties panel
          }
        </div>
      }
    }
  `,
})
export class VideoEmbedView {
  private readonly sanitizer = inject(DomSanitizer);

  readonly url = input('');
  readonly title = input('');
  /** false while the block is not selected, so a click on the video selects the block instead of playing it */
  readonly interactive = input(false);

  protected readonly source = computed(() => parseVideoUrl(this.url()));

  /**
   * The only trusted value: it is built by parseVideoUrl from a validated id on a fixed list of
   * video sites. The computed keeps it stable, so the player does not reload on unrelated changes.
   */
  protected readonly frameUrl = computed(() => {
    const s = this.source();
    return s?.kind === 'iframe' ? this.sanitizer.bypassSecurityTrustResourceUrl(s.src) : null;
  });
}