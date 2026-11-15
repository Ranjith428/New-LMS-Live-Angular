import { Directive, ElementRef, effect, inject, input, output } from '@angular/core';

/**
 * Makes an element directly editable on the page (contenteditable) and keeps it in sync with an html string.
 *
 *   <div [appEditableHtml]="block.html" (edited)="save($event)"></div>
 *
 * The element is only rewritten when the html really differs from what is shown, so typing never resets the caret.
 * Enter inserts a line break (<br>) and pasting keeps plain text only.
 */
@Directive({
  selector: '[appEditableHtml]',
  host: {
    contenteditable: 'true',
    spellcheck: 'false',
    '(input)': 'onInput()',
    '(keydown.enter)': 'onEnter($event)',
    '(paste)': 'onPaste($event)',
  },
})
export class EditableHtml {
  readonly html = input.required<string>({ alias: 'appEditableHtml' });
  readonly edited = output<string>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    effect(() => {
      const html = this.html();
      const shown = this.el.innerHTML;
      // an emptied editable keeps a lone <br>; that already means "empty"
      if (shown !== html && !(html === '' && shown === '<br>')) this.el.innerHTML = html;
    });
  }

  protected onInput(): void {
    const html = this.el.innerHTML;
    this.edited.emit(html === '<br>' ? '' : html);
  }

  protected onEnter(event: Event): void {
    event.preventDefault();
    document.execCommand('insertLineBreak');
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '');
  }
}