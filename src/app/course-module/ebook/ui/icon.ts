import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'chevron-down' | 'align-left' | 'align-center' | 'align-right' | 'align-justify'
  | 'table' | 'eyedropper' | 'link' | 'pencil' | 'code' | 'list' | 'clear' | 'font-color'
  | 'plus' | 'x' | 'trash' | 'copy' | 'up' | 'down' | 'image' | 'upload'
  | 'tri-left' | 'tri-right';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg viewBox="0 0 24 24" [attr.fill]="filled() ? 'currentColor' : 'none'" stroke="currentColor"
         [attr.stroke-width]="filled() ? 3 : 2" stroke-linecap="round" stroke-linejoin="round"
         class="size-full">
      @switch (name()) {
        @case ('chevron-down') { <path d="m6 9 6 6 6-6" /> }
        @case ('align-left') { <path d="M21 6H3M15 12H3M17 18H3" /> }
        @case ('align-center') { <path d="M21 6H3M17 12H7M19 18H5" /> }
        @case ('align-right') { <path d="M21 6H3M21 12H9M21 18H7" /> }
        @case ('align-justify') { <path d="M3 6h18M3 12h18M3 18h18" /> }
        @case ('table') { <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /> }
        @case ('eyedropper') {
          <path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" />
          <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
        }
        @case ('link') {
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        }
        @case ('pencil') { <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /> }
        @case ('code') { <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /> }
        @case ('list') { <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /> }
        @case ('clear') { <path d="M4 7V4h16v3M9 20h6M12 4v16M3 3l18 18" /> }
        @case ('font-color') { <path d="m5 16 7-13 7 13M7.5 11h9" /><path d="M4 21h16" stroke-width="3" /> }
        @case ('plus') { <path d="M5 12h14M12 5v14" /> }
        @case ('x') { <path d="M18 6 6 18M6 6l12 12" /> }
        @case ('trash') { <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /> }
        @case ('copy') { <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /> }
        @case ('up') { <path d="m5 12 7-7 7 7M12 19V5" /> }
        @case ('down') { <path d="M12 5v14M19 12l-7 7-7-7" /> }
        @case ('image') { <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" /> }
        @case ('upload') { <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /> }
        @case ('tri-left') { <path d="M16 5 7 12l9 7z" /> }
        @case ('tri-right') { <path d="M8 5l9 7-9 7z" /> }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly filled = computed(() => this.name() === 'tri-left' || this.name() === 'tri-right');
}
