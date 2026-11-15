import { Section, image, rgba, section, text } from './models';

export interface Thumb {
  bg: string;
  height: number;
  /** wireframe cells inside the thumb */
  cells?: ('img' | 'title' | 'lines' | 'num' | 'btn' | 'avatar')[];
  cols?: number;
  title?: string;
  titleColor?: string;
  glass?: boolean;
  span?: boolean;
}

export interface SectionTemplate {
  id: string;
  label: string;
  thumb: Thumb;
  build: () => Section;
}

export interface TemplateCategory {
  id: string;
  label: string;
  templates: SectionTemplate[];
}

const DARK = rgba(43, 47, 51);
const ORANGE = rgba(251, 174, 60);
const WHITE = rgba(255, 255, 255);
const LOREM =
  'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry’s standard dummy text.';

const poppinsBold = (html: string, over = {}) =>
  text('h1', `<b>${html}</b>`, { fontFamily: 'Poppins', ...over });

const cover = (
  name: string,
  bg: typeof DARK,
  fg: typeof DARK,
  subtitle: boolean,
): (() => Section) => () =>
  section(
    name,
    [
      poppinsBold('Ebook heading 1', { color: fg }),
      ...(subtitle
        ? [text('p', 'Ebook sub heading goes here', { fontFamily: 'Poppins', color: fg })]
        : []),
    ],
    { bgColor: bg, padX: 24, padY: 28, gap: 6 },
  );

const COVERS: SectionTemplate[] = [
  {
    id: 'cover-dark',
    label: 'Dark cover',
    thumb: { bg: '#2b2f33', height: 46, title: 'Ebook heading 1', titleColor: '#fff' },
    build: cover('Cover – dark', DARK, WHITE, false),
  },
  {
    id: 'cover-dark-sub',
    label: 'Dark cover with subtitle',
    thumb: { bg: '#2b2f33', height: 46, title: 'Ebook heading 1', titleColor: '#fff' },
    build: cover('Cover – dark + subtitle', DARK, WHITE, true),
  },
  {
    id: 'cover-orange',
    label: 'Orange cover',
    thumb: { bg: '#fbae3c', height: 46, title: 'Ebook heading 1', titleColor: '#fff' },
    build: cover('Cover – orange', ORANGE, WHITE, false),
  },
  {
    id: 'cover-orange-sub',
    label: 'Orange cover with subtitle',
    thumb: { bg: '#fbae3c', height: 46, title: 'Ebook heading 1', titleColor: '#fff' },
    build: cover('Cover – orange + subtitle', ORANGE, WHITE, true),
  },
  {
    id: 'cover-gradient',
    label: 'Gradient cover',
    thumb: {
      bg: 'linear-gradient(135deg,#8296d6,#d7afd7)',
      height: 84,
      title: 'Ebook heading 1',
      titleColor: '#3a3a3a',
      glass: true,
    },
    build: () =>
      section(
        'Cover – gradient',
        [
          text('caption', 'Ebook heading 4', { align: 'center', fontFamily: 'Poppins' }),
          poppinsBold('Ebook heading 1', { align: 'center', color: rgba(50, 50, 50) }),
          text('caption', '⌄', { align: 'center' }),
        ],
        { bgMode: 'gradient', align: 'center', padX: 40, padY: 40, glass: true, gap: 4 },
      ),
  },
];

const MEDIA: SectionTemplate[] = [
  {
    id: 'media-left',
    label: 'Image left, text right',
    thumb: { bg: '#fff', height: 70, cols: 2, cells: ['img', 'lines'] },
    build: () =>
      section(
        'Image + text',
        [image(), text('p', `<b style="font-size:16px">Heading</b><br>${LOREM}`)],
        { cols: 2, gap: 24, padY: 12 },
      ),
  },
  {
    id: 'media-right',
    label: 'Text left, image right',
    thumb: { bg: '#fff', height: 70, cols: 2, cells: ['lines', 'img'] },
    build: () =>
      section(
        'Text + image',
        [text('p', `<b>Heading</b><br>${LOREM}`), image()],
        { cols: 2, gap: 24, padY: 12 },
      ),
  },
  {
    id: 'media-top',
    label: 'Image on top',
    thumb: { bg: '#fff', height: 84, cols: 1, cells: ['img', 'title', 'lines'] },
    build: () =>
      section('Image on top', [image(), text('h2', 'Image heading'), text('p', LOREM)], {
        gap: 10,
        padY: 12,
      }),
  },
  {
    id: 'media-two-text',
    label: 'Two text columns',
    thumb: { bg: '#fff', height: 60, cols: 2, cells: ['lines', 'lines'] },
    build: () =>
      section('Two columns', [text('p', LOREM), text('p', LOREM)], {
        cols: 2,
        gap: 24,
        padY: 12,
      }),
  },
];

const counters = (n: number, name: string): (() => Section) => () => {
  const nums = ['120+', '48', '15k', '99%'].slice(0, n);
  const labels = ['Students', 'Lessons', 'Downloads', 'Satisfaction'].slice(0, n);
  return section(
    name,
    [
      ...nums.map((v) =>
        text('h1', `<b>${v}</b>`, { align: 'center', color: rgba(79, 179, 200) }),
      ),
      ...labels.map((l) => text('p', l, { align: 'center' })),
    ],
    { cols: n, gap: 6, padY: 20, bgColor: rgba(244, 244, 244) },
  );
};

const COUNTERS: SectionTemplate[] = [
  {
    id: 'counter-3',
    label: 'Three counters',
    thumb: { bg: '#f4f4f4', height: 56, cols: 3, cells: ['num', 'num', 'num'] },
    build: counters(3, 'Counters – 3'),
  },
  {
    id: 'counter-4',
    label: 'Four counters',
    thumb: { bg: '#f4f4f4', height: 56, cols: 4, cells: ['num', 'num', 'num', 'num'] },
    build: counters(4, 'Counters – 4'),
  },
];

const DOWNLOAD: SectionTemplate[] = [
  {
    id: 'download-card',
    label: 'Download card',
    thumb: { bg: '#f4f4f4', height: 84, cols: 1, cells: ['avatar', 'title', 'btn'] },
    build: () =>
      section(
        'Download file',
        [
          image({ width: 14, height: 70, fit: 'contain', placeholder: 'File icon' }),
          text('h2', 'Download the file', { align: 'center' }),
          text('p', 'Get the full ebook as a PDF to read offline.', { align: 'center' }),
          text('button', 'Download', {
            align: 'center',
            color: rgba(255, 255, 255),
            bg: rgba(79, 179, 200),
          }),
        ],
        { align: 'center', padY: 24, padX: 24, gap: 8, bgColor: rgba(244, 244, 244), radius: 16 },
      ),
  },
];

const EXTERNAL: SectionTemplate[] = [
  {
    id: 'external-embed',
    label: 'Video / embed',
    thumb: { bg: '#fff', height: 84, cols: 1, cells: ['title', 'img'] },
    build: () =>
      section(
        'External content',
        [
          text('h3', 'External content'),
          image({ height: 220, placeholder: 'Paste a video or embed URL in the image source' }),
        ],
        { gap: 10, padY: 12 },
      ),
  },
];

const person = (): never[] => [];
void person;

const TEAM: SectionTemplate[] = [
  {
    id: 'team-3',
    label: 'Three authors',
    thumb: { bg: '#fff', height: 78, cols: 3, cells: ['avatar', 'avatar', 'avatar', 'lines', 'lines', 'lines'] },
    build: () =>
      section(
        'Team & authors',
        [
          ...[0, 1, 2].map(() =>
            image({ width: 44, height: 90, radius: 100, placeholder: 'Photo' }),
          ),
          ...['Author name', 'Author name', 'Author name'].map((n) =>
            text('h3', n, { align: 'center' }),
          ),
          ...[0, 1, 2].map(() => text('caption', 'Role / short bio', { align: 'center' })),
        ],
        { cols: 3, gap: 8, padY: 16 },
      ),
  },
];

const OWN: SectionTemplate[] = [
  {
    id: 'own-blank',
    label: 'Blank',
    thumb: { bg: '#fff', height: 50, cols: 1, cells: ['lines'] },
    build: () => section('Blank section', [text('p', '')], { padY: 12 }),
  },
  {
    id: 'own-2',
    label: 'Two columns',
    thumb: { bg: '#fff', height: 50, cols: 2, cells: ['lines', 'lines'] },
    build: () =>
      section('Two columns', [text('p', ''), text('p', '')], { cols: 2, gap: 24, padY: 12 }),
  },
  {
    id: 'own-3',
    label: 'Three columns',
    thumb: { bg: '#fff', height: 50, cols: 3, cells: ['lines', 'lines', 'lines'] },
    build: () =>
      section('Three columns', [text('p', ''), text('p', ''), text('p', '')], {
        cols: 3,
        gap: 24,
        padY: 12,
      }),
  },
];

export const CATEGORIES: TemplateCategory[] = [
  { id: 'covers', label: 'Ebook Covers', templates: COVERS },
  { id: 'media', label: 'Media & Text', templates: MEDIA },
  { id: 'counters', label: 'Counters', templates: COUNTERS },
  { id: 'download', label: 'Download File', templates: DOWNLOAD },
  { id: 'external', label: 'External Content', templates: EXTERNAL },
  { id: 'team', label: 'Team & Authors', templates: TEAM },
  { id: 'own', label: 'Own Layout', templates: OWN },
];

const LONG =
  'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset\'s Body Type sheets. It has survived not';
const LONG_FULL =
  LONG +
  ' only many decades, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised thanks to these sheets and more recently with desktop publishing software like Aldus PageMaker and Microsoft Word including versions of Lorem Ipsum.';

/** The page that is open when the editor first loads (matches the Figma frame). */
export function initialSections(): Section[] {
  return [
    section('Intro', [text('h1', ''), text('p', LONG, { })], { gap: 8 }),
    section(
      'Paragraphs',
      [
        text('h2', 'Paragraph'),
        text('p', LONG_FULL),
        text('p', LONG_FULL),
        text('p', LONG_FULL),
      ],
      { gap: 10 },
    ),
  ];
}
