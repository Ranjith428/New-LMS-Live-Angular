import { ImageBlock, ImageShadow, RGBA, Section, TEXT_STYLES, TextBlock, VideoBlock } from './models';

export const css = (c: RGBA | null | undefined): string =>
  c ? `rgba(${c.r}, ${c.g}, ${c.b}, ${(c.a ?? 100) / 100})` : 'transparent';

export const hex = (c: RGBA): string =>
  '#' + [c.r, c.g, c.b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');

export const fromHex = (h: string, a = 100): RGBA => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  const n = m ? parseInt(m[1], 16) : 0;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
};

export const SHADOWS: Record<ImageShadow, string> = {
  none: 'none',
  soft: '0 2px 8px rgba(0,0,0,.12)',
  medium: '0 6px 18px rgba(0,0,0,.2)',
  strong: '0 12px 32px rgba(0,0,0,.32)',
};

export function textStyle(b: TextBlock): Record<string, string> {
  const t = TEXT_STYLES[b.type];
  const s = b.shadow;
  const hasShadow = !!(s.x || s.y || s.blur);
  const style: Record<string, string> = {
    'font-family': `'${b.fontFamily}', sans-serif`,
    'font-size': `${t.size}px`,
    'font-weight': `${t.weight}`,
    'line-height': `${t.lh}`,
    color: css(b.color),
    opacity: `${(b.opacity ?? 100) / 100}`,
    'text-align': b.align,
    'text-shadow': hasShadow ? `${s.x ?? 0}px ${s.y ?? 0}px ${s.blur ?? 0}px ${css(s.color)}` : 'none',
  };
  if (b.type === 'button') {
    style['background'] = css(b.bg ?? { r: 110, g: 196, b: 203, a: 100 });
    style['padding'] = '8px 20px';
    style['border-radius'] = '8px';
    style['display'] = 'inline-block';
    style['width'] = 'fit-content';
    if (b.align === 'center') style['justify-self'] = 'center';
    if (b.align === 'right') style['justify-self'] = 'end';
  }
  return style;
}

export function imageStyle(b: ImageBlock): Record<string, string> {
  const style: Record<string, string> = {
    width: `${b.width}%`,
    opacity: `${(b.opacity ?? 100) / 100}`,
    'border-radius': `${b.radius ?? 0}px`,
    'box-shadow': SHADOWS[b.shadow],
    border: b.borderWidth ? `${b.borderWidth}px solid ${css(b.borderColor)}` : 'none',
    'margin-left': b.align === 'left' ? '0' : 'auto',
    'margin-right': b.align === 'right' ? '0' : 'auto',
    'object-fit': b.fit,
    display: 'block',
  };
  style['height'] = b.height ? `${b.height}px` : b.src ? 'auto' : '160px';
  return style;
}

export function sectionStyle(s: Section): Record<string, string> {
  let background = css(s.bgColor);
  if (s.bgMode === 'gradient') {
    background = `linear-gradient(${s.gradAngle}deg, ${css(s.gradFrom)}, ${css(s.gradTo)})`;
  } else if (s.bgMode === 'image' && s.bgImage) {
    background = `center / cover no-repeat url("${s.bgImage}")`;
  }
  return {
    background,
    'padding': `${s.padY ?? 0}px ${s.padX ?? 0}px`,
    'min-height': s.minHeight ? `${s.minHeight}px` : '0',
    'border-radius': `${s.radius ?? 0}px`,
    'box-shadow': SHADOWS[s.shadow],
    border: s.borderWidth ? `${s.borderWidth}px solid ${css(s.borderColor)}` : 'none',
  };
}

export function videoStyle(b: VideoBlock): Record<string, string> {
  return {
    width: `${b.width}%`,
    'margin-left': b.align === 'left' ? '0' : 'auto',
    'margin-right': b.align === 'right' ? '0' : 'auto',
    'border-radius': `${b.radius ?? 0}px`,
    overflow: 'hidden',
    ...(b.height ? { height: `${b.height}px` } : { 'aspect-ratio': '16 / 9' }),
  };
}

export function gridStyle(s: Section): Record<string, string> {
  const style: Record<string, string> = {
    display: 'grid',
    'grid-template-columns': `repeat(${s.cols}, minmax(0, 1fr))`,
    gap: `${s.gap ?? 0}px ${Math.max(s.gap ?? 0, s.cols > 1 ? 24 : 0)}px`,
    'text-align': s.align,
    'align-items': 'start',
  };
  if (s.boxed) {
    style['max-width'] = '760px';
    style['margin'] = '0 auto';
  }
  if (s.glass) {
    style['background'] = 'rgba(255,255,255,.55)';
    style['padding'] = '28px 24px';
    style['border-radius'] = '4px';
    style['backdrop-filter'] = 'blur(6px)';
  }
  return style;
}