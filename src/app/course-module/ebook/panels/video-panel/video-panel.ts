import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EbookStore } from '../../store';
import { Card, NumberField, Row, SelectField } from '../../ui/fields';
import { parseVideoUrl } from '../../video-embed';

@Component({
  selector: 'app-video-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Row, SelectField, NumberField],
  templateUrl: './video-panel.html',
})
export class VideoPanel {
  protected readonly store = inject(EbookStore);
  protected readonly v = this.store.selectedVideo;
  protected readonly alignOptions = ['left', 'center', 'right'].map((x) => ({
    value: x,
    label: x[0].toUpperCase() + x.slice(1),
  }));

  /** Tells the person right away whether the pasted link will play. */
  protected readonly status = computed(() => {
    const url = this.v()?.url.trim();
    if (!url) return null;
    const source = parseVideoUrl(url);
    return source
      ? { ok: true, text: `${source.provider} video found.` }
      : {
          ok: false,
          text: 'This link is not supported. Use a YouTube, Vimeo, Loom or Dailymotion link, or a direct https .mp4 / .webm file.',
        };
  });
}