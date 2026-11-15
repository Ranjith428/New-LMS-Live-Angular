import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EbookStore } from '../../store';
import { Card, ColorField, NumberField, Row, SelectField } from '../../ui/fields';
import { Icon } from '../../ui/icon';

@Component({
  selector: 'app-section-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Row, SelectField, NumberField, ColorField, Icon],
  templateUrl: './section-panel.html',
  styleUrl: './section-panel.css',
})
export class SectionPanel {
  protected readonly store = inject(EbookStore);
  protected readonly s = this.store.selectedSection;
  protected readonly colOptions = [1, 2, 3, 4].map((n) => ({ value: n, label: `${n} column${n > 1 ? 's' : ''}` }));
  protected readonly alignOptions = ['left', 'center', 'right'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
  protected readonly widthOptions = [
    { value: 'full', label: 'Full width' },
    { value: 'boxed', label: 'Boxed' },
  ];
  protected readonly bgOptions = [
    { value: 'color', label: 'Color' },
    { value: 'gradient', label: 'Gradient' },
    { value: 'image', label: 'Image' },
  ];
  protected readonly shadowOptions = ['none', 'soft', 'medium', 'strong'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
  protected readonly onOff = [
    { value: 'off', label: 'Off' },
    { value: 'on', label: 'On' },
  ];

  protected async pickBg(e: Event) {
    const input = e.target as HTMLInputElement;
    const src = await this.store.readFile(input.files?.[0]);
    if (src) this.store.updateSection({ bgImage: src });
    input.value = '';
  }
}
