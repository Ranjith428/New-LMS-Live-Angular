import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CATEGORIES } from '../templates';
import { EbookStore } from '../store';
import { ImagePanel } from '../panels/image-panel/image-panel';
import { SectionPanel } from '../panels/section-panel/section-panel';
import { TextPanel } from '../panels/text-panel/text-panel';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-editor-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextPanel, SectionPanel, ImagePanel, Icon],
  templateUrl: './editor-panel.html',
  styleUrl: './editor-panel.css',
})
export class EditorPanel {
  protected readonly store = inject(EbookStore);
  protected readonly categories = CATEGORIES;
  protected readonly samples = [1, 2, 3, 4];
}
