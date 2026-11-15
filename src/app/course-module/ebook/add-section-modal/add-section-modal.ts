import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CATEGORIES, SectionTemplate } from '../templates';
import { EbookStore } from '../store';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-add-section-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './add-section-modal.html',
})
export class AddSectionModal {
  protected readonly store = inject(EbookStore);
  protected readonly categories = CATEGORIES;
  protected readonly current = computed(
    () => CATEGORIES.find((c) => c.id === this.store.modalCategory()) ?? CATEGORIES[0],
  );

  protected insert(t: SectionTemplate) {
    this.store.insertSection(t.build);
  }
}
