import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Block, Section, TEXT_STYLES } from '../models';
import { EbookStore } from '../store';
import { gridStyle, imageStyle, sectionStyle, textStyle } from '../style-utils';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NgTemplateOutlet],
  host: { '(document:keydown)': 'onKey($event)' },
  templateUrl: './canvas.html',
  styleUrl: './canvas.css',
})
export class Canvas {
  protected readonly store = inject(EbookStore);

  protected readonly secStyle = sectionStyle;
  protected readonly grid = gridStyle;
  protected readonly txt = textStyle;
  protected readonly img = (b: Block) => imageStyle(b as never);
  protected asImage = (b: Block) => b as Extract<Block, { kind: 'image' }>;

  protected secCls(s: Section) {
    return this.isSectionSel(s)
      ? 'outline-dashed outline-2 outline-[#6ec4cb]'
      : 'hover:outline-dashed hover:outline-1 hover:outline-[#6ec4cb]/50';
  }
  protected blockCls(b: Block) {
    return this.isBlockSel(b)
      ? 'outline outline-2 outline-[#6ec4cb]'
      : 'hover:outline-dashed hover:outline-1 hover:outline-[#6ec4cb]/60';
  }
  protected isSectionSel(s: Section) {
    const sel = this.store.selection();
    return sel?.kind === 'section' && sel.sectionId === s.id;
  }
  protected isBlockSel(b: Block) {
    return this.store.selection()?.blockId === b.id;
  }
  protected placeholder(b: Block) {
    return b.kind === 'text' ? TEXT_STYLES[b.type].placeholder : '';
  }
  /** The intro paragraph is shown as a 2-line teaser, like in the design. */
  protected clamp(s: Section, b: Block) {
    return s.name === 'Intro' && b.kind === 'text' && b.type === 'p' && !this.isBlockSel(b);
  }

  protected onSection(e: Event, s: Section) {
    e.stopPropagation();
    this.store.select({ kind: 'section', sectionId: s.id });
  }
  protected onBlock(e: Event, s: Section, b: Block) {
    e.stopPropagation();
    this.store.select({ kind: b.kind, sectionId: s.id, blockId: b.id });
  }

  protected onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    const typing = t.closest('input, textarea, select, [contenteditable="true"]');
    if (e.key === 'Escape') {
      if (this.store.addModal()) this.store.closeAddSection();
      else if (!typing) this.store.select(null);
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && !this.store.addModal()) {
      e.preventDefault();
      this.store.deleteSelected();
    }
  }
}
