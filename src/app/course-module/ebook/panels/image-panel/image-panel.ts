import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EbookStore } from '../../store';
import { Card, ColorField, NumberField, Row, SelectField } from '../../ui/fields';
import { Icon } from '../../ui/icon';

@Component({
  selector: 'app-image-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Row, SelectField, NumberField, ColorField, Icon],
  templateUrl: './image-panel.html',
  styleUrl: './image-panel.css',
})
export class ImagePanel {
  protected readonly store = inject(EbookStore);
  protected readonly i = this.store.selectedImage;
  protected readonly fitOptions = [
    { value: 'cover', label: 'Cover (crop)' },
    { value: 'contain', label: 'Contain (fit)' },
  ];
  protected readonly alignOptions = ['left', 'center', 'right'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
  protected readonly shadowOptions = ['none', 'soft', 'medium', 'strong'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

  protected async pick(e: Event) {
    const input = e.target as HTMLInputElement;
    const src = await this.store.readFile(input.files?.[0]);
    if (src) this.store.updateImage({ src });
    input.value = '';
  }
}
