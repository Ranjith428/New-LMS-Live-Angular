import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { RGBA } from '../models';
import { fromHex, hex } from '../style-utils';
import { Icon } from './icon';

/** White rounded card used for every property group. */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="rounded-2xl bg-white px-[17px] pb-[14px] pt-[15px]" [style.min-height.px]="minHeight()">
      <h3 class="mb-[14px] text-[17px] font-medium leading-[22px] text-[#555555]">{{ title() }}</h3>
      <div class="flex flex-col gap-[12px]"><ng-content /></div>
    </div>
  `,
})
export class Card {
  readonly title = input.required<string>();
  readonly minHeight = input<number>(0);
}

/** Label on the left, control on the right. */
@Component({
  selector: 'app-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex min-h-[24px] items-center justify-between gap-3">
      <span class="text-[14px] leading-[18px] text-[#555555]">{{ label() }}</span>
      <div [style.width.px]="width()" [class.shrink-0]="true"><ng-content /></div>
    </div>
  `,
})
export class Row {
  readonly label = input.required<string>();
  readonly width = input<number | null>(155);
}

@Component({
  selector: 'app-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <select
        class="h-[19px] w-full cursor-pointer appearance-none rounded-md bg-[#f1f1f1] pl-2 pr-5 text-[10px] text-[#555555] outline-none focus:ring-1 focus:ring-[#6ec4cb]"
        [value]="value()"
        (change)="changed.emit($any($event.target).value)"
      >
        @for (o of options(); track o.value) {
          <option [value]="o.value" [selected]="o.value === value()">{{ o.label }}</option>
        }
      </select>
      <app-icon name="chevron-down" class="pointer-events-none absolute right-[6px] top-[5px] size-[9px] text-[#555555]" />
    </div>
  `,
  imports: [Icon],
})
export class SelectField {
  readonly value = input<string | number>('');
  readonly options = input.required<{ value: string | number; label: string }[]>();
  readonly changed = output<string>();
}

@Component({
  selector: 'app-number',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="flex h-[19px] items-center rounded-md bg-[#f1f1f1] px-2 text-[10px] focus-within:ring-1 focus-within:ring-[#6ec4cb]">
      <input
        type="number"
        class="min-w-0 flex-1 bg-transparent text-[#555555] outline-none placeholder:text-[#767676]"
        [placeholder]="placeholder()"
        [value]="value() ?? ''"
        [attr.min]="min()"
        [attr.max]="max()"
        (input)="onInput($any($event.target).value)"
      />
      @if (suffix()) {
        <span class="ml-1 text-[#767676]">{{ suffix() }}</span>
      }
    </label>
  `,
})
export class NumberField {
  readonly value = input<number | null>(null);
  readonly placeholder = input('Enter a number');
  readonly suffix = input('');
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly changed = output<number | null>();

  protected onInput(raw: string) {
    if (raw === '') return this.changed.emit(null);
    let n = Number(raw);
    if (Number.isNaN(n)) return;
    if (this.min() !== null) n = Math.max(this.min()!, n);
    if (this.max() !== null) n = Math.min(this.max()!, n);
    this.changed.emit(n);
  }
}

/** [eyedropper] [swatch] [RGB r g b a] – same control as the Figma "Color" row. */
@Component({
  selector: 'app-color',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="flex items-center justify-end gap-[6px]">
      <button
        type="button"
        class="flex h-[20px] w-[20px] items-center justify-center rounded-md bg-[#f1f1f1] text-[#555555] hover:text-[#4fb3c8]"
        title="Pick colour from screen"
        (click)="eyedrop()"
      >
        <app-icon name="eyedropper" class="size-[11px]" />
      </button>
      <label
        class="relative block size-[16px] cursor-pointer overflow-hidden rounded-[4px] ring-1 ring-black/5"
        [style.background]="swatch()"
        title="Pick colour"
      >
        <input #picker type="color" class="absolute inset-0 size-full cursor-pointer opacity-0"
               [value]="hexValue()" (input)="onPick($any($event.target).value)" />
      </label>
      <div class="flex h-[19px] items-center gap-[5px] rounded-md bg-[#f1f1f1] px-[7px] text-[10px] text-[#555555]">
        <span>RGB</span>
        @for (ch of channels; track ch) {
          <input
            type="number"
            class="w-[20px] bg-transparent text-center outline-none focus:text-[#4fb3c8]"
            [value]="value()[ch]"
            [attr.min]="0"
            [attr.max]="ch === 'a' ? 100 : 255"
            (input)="onChannel(ch, $any($event.target).value)"
          />
        }
      </div>
    </div>
  `,
})
export class ColorField {
  readonly value = input.required<RGBA>();
  readonly changed = output<RGBA>();
  protected readonly channels = ['r', 'g', 'b', 'a'] as const;
  private readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');

  protected swatch() {
    const c = this.value();
    return `rgba(${c.r},${c.g},${c.b},${c.a / 100})`;
  }
  protected hexValue() {
    return hex(this.value());
  }
  protected onPick(h: string) {
    this.changed.emit(fromHex(h, this.value().a));
  }
  protected onChannel(ch: 'r' | 'g' | 'b' | 'a', raw: string) {
    const max = ch === 'a' ? 100 : 255;
    const n = Math.max(0, Math.min(max, Number(raw) || 0));
    this.changed.emit({ ...this.value(), [ch]: n });
  }
  protected async eyedrop() {
    const ED = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (ED) {
      try {
        const r = await new ED().open();
        this.changed.emit(fromHex(r.sRGBHex, this.value().a));
      } catch {
        /* cancelled */
      }
    } else {
      this.picker()?.nativeElement.click();
    }
  }
}
