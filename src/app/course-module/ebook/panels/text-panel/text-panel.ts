import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Align, FONT_FAMILIES, ShadowPreset, TEXT_TYPES, TextShadow } from '../../models';
import { EbookStore } from '../../store';
import { ColorField, Card, NumberField, Row, SelectField } from '../../ui/fields';
import { Icon, IconName } from '../../ui/icon';

const ALIGNS: { value: Align; icon: IconName }[] = [
  { value: 'left', icon: 'align-left' },
  { value: 'center', icon: 'align-center' },
  { value: 'right', icon: 'align-right' },
  { value: 'justify', icon: 'align-justify' },
];

const PRESETS: { value: ShadowPreset; label: string; shadow: string }[] = [
  { value: 'none', label: 'None', shadow: 'none' },
  { value: 'left', label: 'Left', shadow: '-2px 0 2px rgba(0,0,0,.45)' },
  { value: 'right', label: 'Right', shadow: '2px 0 2px rgba(0,0,0,.45)' },
  { value: 'bottom', label: 'Bottom', shadow: '0 2px 2px rgba(0,0,0,.45)' },
  { value: 'round', label: 'Round', shadow: '0 0 4px rgba(0,0,0,.55)' },
];

@Component({
  selector: 'app-text-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Row, SelectField, NumberField, ColorField, Icon],
  templateUrl: './text-panel.html',
  styleUrl: './text-panel.css',
})
export class TextPanel {
  protected readonly store = inject(EbookStore);
  protected readonly t = this.store.selectedText;
  protected readonly types = TEXT_TYPES;
  protected readonly fonts = FONT_FAMILIES.map((f) => ({ value: f, label: f }));
  protected readonly aligns = ALIGNS;
  protected readonly presets = PRESETS;
  protected readonly alignOpen = signal(false);
  protected readonly currentAlign = computed<IconName>(
    () => ALIGNS.find((a) => a.value === this.t()?.align)?.icon ?? 'align-left',
  );

  private readonly editor = viewChild<ElementRef<HTMLDivElement>>('editor');
  private readonly blockId = computed(() => this.t()?.id);
  private range: Range | null = null;

  constructor() {
    // Load the selected block's html into the editor only when the selection (or the editor) changes,
    // so typing never resets the caret.
    effect(() => {
      const el = this.editor()?.nativeElement;
      const id = this.blockId();
      if (!el || !id) return;
      untracked(() => {
        el.innerHTML = this.t()?.html ?? '';
      });
    });
  }

  protected onEdit() {
    const el = this.editor()?.nativeElement;
    if (!el) return;
    const html = el.innerHTML === '<br>' ? '' : el.innerHTML;
    this.store.updateText({ html });
  }

  protected setAlign(a: Align) {
    this.store.updateText({ align: a });
    this.alignOpen.set(false);
  }

  protected setShadow(patch: Partial<TextShadow>) {
    const cur = this.t();
    if (!cur) return;
    this.store.updateText({ shadow: { ...cur.shadow, ...patch, preset: 'none' } });
  }

  /* ---- ebook-rich text helpers (document.execCommand keeps the toolbar dependency-free) ---- */
  protected saveRange() {
    const sel = window.getSelection();
    const el = this.editor()?.nativeElement;
    if (sel && sel.rangeCount && el?.contains(sel.anchorNode)) this.range = sel.getRangeAt(0).cloneRange();
  }
  private restoreRange() {
    const el = this.editor()?.nativeElement;
    el?.focus();
    if (this.range) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(this.range);
    }
  }
  protected exec(cmd: string, value?: string) {
    this.restoreRange();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(cmd, false, value);
    this.saveRange();
    this.onEdit();
  }
  protected foreColor(hex: string) {
    this.exec('foreColor', hex);
  }
  protected highlight() {
    this.wrapSelection('mark');
  }
  protected code() {
    this.wrapSelection('code');
  }
  private wrapSelection(tag: string) {
    this.restoreRange();
    const text = window.getSelection()?.toString();
    if (text) document.execCommand('insertHTML', false, `<${tag}>${text.replace(/</g, '&lt;')}</${tag}>`);
    this.saveRange();
    this.onEdit();
  }
  protected link() {
    this.restoreRange();
    const url = window.prompt('Link URL', 'https://');
    if (url) this.exec('createLink', url);
  }
  protected insertTable() {
    this.exec('insertHTML', '<table><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></table><br>');
  }
  protected insertVariable() {
    this.exec('insertText', '{' + '{variable}' + '}');
  }
}
