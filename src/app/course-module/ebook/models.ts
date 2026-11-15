export interface RGBA {
  r: number;
  g: number;
  b: number;
  /** 0 – 100 */
  a: number;
}

export type TextType = 'h1' | 'h2' | 'h3' | 'p' | 'caption' | 'button';
export type Align = 'left' | 'center' | 'right' | 'justify';
export type ShadowPreset = 'none' | 'left' | 'right' | 'bottom' | 'round';
export type SelectionKind = 'text' | 'image' | 'section';

export interface TextShadow {
  preset: ShadowPreset;
  x: number | null;
  y: number | null;
  blur: number | null;
  color: RGBA;
}

export interface TextBlock {
  id: string;
  kind: 'text';
  type: TextType;
  html: string;
  fontFamily: string;
  opacity: number | null;
  color: RGBA;
  bg: RGBA | null;
  align: Align;
  shadow: TextShadow;
}

export type ImageShadow = 'none' | 'soft' | 'medium' | 'strong';

export interface ImageBlock {
  id: string;
  kind: 'image';
  src: string;
  alt: string;
  placeholder: string;
  /** % of column width */
  width: number;
  /** px – 0 means automatic */
  height: number;
  fit: 'cover' | 'contain';
  align: 'left' | 'center' | 'right';
  opacity: number | null;
  radius: number | null;
  borderWidth: number | null;
  borderColor: RGBA;
  shadow: ImageShadow;
}

export type Block = TextBlock | ImageBlock;

export interface Section {
  id: string;
  name: string;
  cols: number;
  align: Align;
  boxed: boolean;
  bgMode: 'color' | 'gradient' | 'image';
  bgColor: RGBA;
  gradFrom: RGBA;
  gradTo: RGBA;
  gradAngle: number;
  bgImage: string;
  padX: number | null;
  padY: number | null;
  gap: number | null;
  minHeight: number | null;
  radius: number | null;
  borderWidth: number | null;
  borderColor: RGBA;
  shadow: ImageShadow;
  /** translucent "glass" card inside the section */
  glass: boolean;
  blocks: Block[];
}

export interface Selection {
  kind: SelectionKind;
  sectionId: string;
  blockId?: string;
}

export const TEXT_TYPES: { value: TextType; label: string }[] = [
  { value: 'h1', label: 'Ebook Heading 1' },
  { value: 'h2', label: 'Ebook Heading 2' },
  { value: 'h3', label: 'Ebook Heading 3' },
  { value: 'p', label: 'Ebook Paragraph' },
  { value: 'caption', label: 'Ebook Caption' },
  { value: 'button', label: 'Ebook Button' },
];

export const TEXT_STYLES: Record<
  TextType,
  { size: number; weight: number; lh: number; placeholder: string }
> = {
  h1: { size: 32, weight: 500, lh: 1.2, placeholder: 'Enter a heading' },
  h2: { size: 20, weight: 500, lh: 1.3, placeholder: 'Enter a sub heading' },
  h3: { size: 16, weight: 500, lh: 1.3, placeholder: 'Enter a title' },
  p: { size: 11, weight: 400, lh: 1.3, placeholder: 'Enter your paragraph' },
  caption: { size: 10, weight: 400, lh: 1.3, placeholder: 'Enter a caption' },
  button: { size: 12, weight: 600, lh: 1.2, placeholder: 'Button' },
};

export const FONT_FAMILIES = [
  'DM Sans',
  'Poppins',
  'Inter',
  'Roboto',
  'Lora',
  'Playfair Display',
];

export const rgba = (r: number, g: number, b: number, a = 100): RGBA => ({ r, g, b, a });
export const INK = rgba(85, 85, 85);
export const TEAL = rgba(110, 196, 203);

let counter = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export const NO_SHADOW = (): TextShadow => ({
  preset: 'none',
  x: null,
  y: null,
  blur: null,
  color: rgba(72, 65, 192, 80),
});

export function text(type: TextType, html = '', over: Partial<TextBlock> = {}): TextBlock {
  return {
    id: uid('t'),
    kind: 'text',
    type,
    html,
    fontFamily: 'DM Sans',
    opacity: null,
    color: { ...INK },
    bg: null,
    align: 'left',
    shadow: NO_SHADOW(),
    ...over,
  };
}

export function image(over: Partial<ImageBlock> = {}): ImageBlock {
  return {
    id: uid('i'),
    kind: 'image',
    src: '',
    alt: '',
    placeholder: 'Click to add an image',
    width: 100,
    height: 0,
    fit: 'cover',
    align: 'center',
    opacity: null,
    radius: null,
    borderWidth: null,
    borderColor: rgba(220, 220, 220),
    shadow: 'none',
    ...over,
  };
}

export function section(name: string, blocks: Block[], over: Partial<Section> = {}): Section {
  return {
    id: uid('s'),
    name,
    cols: 1,
    align: 'left',
    boxed: false,
    bgMode: 'color',
    bgColor: rgba(255, 255, 255, 0),
    gradFrom: rgba(130, 150, 210),
    gradTo: rgba(215, 175, 215),
    gradAngle: 135,
    bgImage: '',
    padX: null,
    padY: null,
    gap: null,
    minHeight: null,
    radius: null,
    borderWidth: null,
    borderColor: rgba(220, 220, 220),
    shadow: 'none',
    glass: false,
    blocks,
    ...over,
  };
}
