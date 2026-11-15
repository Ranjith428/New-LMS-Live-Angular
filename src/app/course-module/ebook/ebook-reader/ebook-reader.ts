import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { Block, Section } from '../models';
import { gridStyle, imageStyle, sectionStyle, textStyle, videoStyle } from '../style-utils';
import { VideoEmbedView } from '../ui/video-embed-view';

/**
 * Read-only ebook page: draws the sections / blocks the instructor designed in the Ebook editor.
 * Used by the course content viewer (learners, and admins / instructors previewing). Nothing here edits anything.
 *
 * Text is bound with [innerHTML], so Angular's sanitizer removes scripts and event handlers from the stored HTML.
 */
@Component({
  selector: 'app-ebook-reader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None, // the .ebook-rich rules must reach the [innerHTML] content
  imports: [VideoEmbedView],
  styleUrl: './ebook-reader.css',
  host: { class: 'block' },
  template: `
    <article class="ebook-reader pb-[28px] pl-[27px] pr-[46px] pt-[30px] font-['DM_Sans',sans-serif] text-[#555555]" aria-label="Ebook">
      @for (s of sections(); track s.id; let last = $last) {
        <section [style]="secStyle(s)" [style.margin-bottom.px]="last ? 0 : 16">
          <div [style]="grid(s)">
            @for (b of s.blocks; track b.id) {
              @if (b.kind === 'text') {
                <div
                  class="relative"
                  [style.justify-self]="b.type === 'button' ? null : 'stretch'"
                  [style.display]="b.type === 'button' ? 'flex' : 'block'"
                  [style.justify-content]="b.type === 'button' ? (b.align === 'center' ? 'center' : b.align === 'right' ? 'flex-end' : 'flex-start') : null"
                >
                  <div class="ebook-rich break-words" [style]="txt(b)" [innerHTML]="b.html"></div>
                </div>
              } @else if (b.kind === 'image') {
                @if (asImage(b).src) {
                  <div [style]="img(b)">
                    <img [src]="asImage(b).src" [alt]="asImage(b).alt" class="size-full" [style.object-fit]="asImage(b).fit" [style.border-radius]="'inherit'" />
                  </div>
                }
              } @else {
                <div [style]="vid(b)">
                  <app-video-embed [url]="asVideo(b).url" [title]="asVideo(b).title" [interactive]="true" />
                </div>
              }
            }
          </div>
        </section>
      }
    </article>
  `,
})
export class EbookReader {
  /** The ebook's sections (the parsed `content` of the backend ebook). */
  readonly sections = input.required<Section[]>();

  protected readonly secStyle = sectionStyle;
  protected readonly grid = gridStyle;
  protected readonly txt = textStyle;
  protected readonly vid = videoStyle;
  protected readonly img = (b: Block) => imageStyle(b as never);
  protected readonly asImage = (b: Block) => b as Extract<Block, { kind: 'image' }>;
  protected readonly asVideo = (b: Block) => b as Extract<Block, { kind: 'video' }>;
}