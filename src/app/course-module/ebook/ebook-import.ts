import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { Block, Section, TextType, image, section, text } from './models';

/** File types the "Upload" option of the Ebook pop-up accepts. */
export const EBOOK_IMPORT_ACCEPT = '.docx,.txt,.md,.html,.htm';
const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set(['docx', 'txt', 'md', 'html', 'htm']);
const MAX_BYTES = 25 * 1024 * 1024;

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

/** Message is shown to the person as-is. */
export class EbookImportError extends Error {}

type Item =
  | { kind: 'heading'; level: 1 | 2 | 3; html: string }
  | { kind: 'p'; html: string }
  | { kind: 'image'; src: string };

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const plainText = (html: string): string =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();

const extensionOf = (name: string): string => name.split('.').pop()?.toLowerCase() ?? '';

/**
 * Turns an uploaded document into ebook sections and hands them to the editor page:
 * Add Activity -> Ebook -> Upload parses the file, calls set(), then navigates to the editor,
 * whose store takes() the sections instead of starting blank.
 */
@Injectable({ providedIn: 'root' })
export class EbookImportService {
  private pending: Section[] | null = null;

  set(sections: Section[]): void {
    this.pending = sections;
  }

  /** Returns the waiting import once (and clears it), or null for "Start from scratch". */
  take(): Section[] | null {
    const sections = this.pending;
    this.pending = null;
    return sections;
  }

  async parse(file: File): Promise<Section[]> {
    const ext = extensionOf(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new EbookImportError('Unsupported file. Please upload a DOCX, TXT, MD or HTML document.');
    }
    if (file.size === 0) throw new EbookImportError('This file is empty.');
    if (file.size > MAX_BYTES) throw new EbookImportError('This file is too large (maximum 25 MB).');

    let items: Item[];
    if (ext === 'docx') items = await this.fromDocx(file);
    else if (ext === 'html' || ext === 'htm') items = this.fromHtml(await file.text());
    else items = this.fromPlainText(await file.text());

    if (items.length === 0) throw new EbookImportError('No readable content was found in this document.');
    return this.toSections(items);
  }

  /* ------------------------------ sections ------------------------------ */

  /** A new section starts at every Heading 1 / Heading 2, so each part of the document is easy to edit. */
  private toSections(items: Item[]): Section[] {
    const sections: Section[] = [];
    let name = 'Introduction';
    let blocks: Block[] = [];

    const flush = () => {
      if (blocks.length) sections.push(section(name, blocks, { gap: 10, padY: 12 }));
      blocks = [];
    };

    for (const item of items) {
      if (item.kind === 'heading') {
        if (item.level <= 2) {
          flush();
          name = plainText(item.html).slice(0, 40) || 'Section';
        }
        blocks.push(text(`h${item.level}` as TextType, item.html));
      } else if (item.kind === 'p') {
        blocks.push(text('p', item.html));
      } else {
        blocks.push(image({ src: item.src, fit: 'contain' }));
      }
    }
    flush();
    return sections;
  }

  /* -------------------------------- DOCX -------------------------------- */

  private async fromDocx(file: File): Promise<Item[]> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch {
      throw new EbookImportError('This is not a valid Word (.docx) document.');
    }
    const docEntry = zip.file('word/document.xml');
    if (!docEntry) throw new EbookImportError('This is not a valid Word (.docx) document.');

    const xml = new DOMParser().parseFromString(await docEntry.async('string'), 'application/xml');
    const body = xml.getElementsByTagNameNS(NS_W, 'body')[0];
    if (!body) throw new EbookImportError('This is not a valid Word (.docx) document.');

    const relationships = await this.docxImageTargets(zip);
    const items: Item[] = [];
    for (const node of Array.from(body.children)) {
      if (node.namespaceURI !== NS_W) continue;
      if (node.localName === 'p') {
        await this.docxParagraph(node, zip, relationships, items);
      } else if (node.localName === 'tbl') {
        // tables become plain paragraphs, one per cell paragraph
        for (const p of Array.from(node.getElementsByTagNameNS(NS_W, 'p'))) {
          await this.docxParagraph(p, zip, relationships, items);
        }
      }
    }
    return items;
  }

  /** relationship id -> path of the image inside the zip */
  private async docxImageTargets(zip: JSZip): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const entry = zip.file('word/_rels/document.xml.rels');
    if (!entry) return map;
    const xml = new DOMParser().parseFromString(await entry.async('string'), 'application/xml');
    for (const rel of Array.from(xml.getElementsByTagName('Relationship'))) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (!id || !target || !(rel.getAttribute('Type') ?? '').endsWith('/image')) continue;
      map.set(id, target.startsWith('/') ? target.slice(1) : `word/${target}`);
    }
    return map;
  }

  private async docxParagraph(
    p: Element,
    zip: JSZip,
    images: Map<string, string>,
    out: Item[],
  ): Promise<void> {
    const style = p.getElementsByTagNameNS(NS_W, 'pStyle')[0]?.getAttributeNS(NS_W, 'val') ?? '';
    const level = this.headingLevel(style);
    const isListItem =
      p.getElementsByTagNameNS(NS_W, 'numPr').length > 0 || /^list(bullet|number|paragraph)/i.test(style);

    let html = '';
    const found: string[] = [];
    for (const run of Array.from(p.getElementsByTagNameNS(NS_W, 'r'))) {
      html += this.docxRun(run, level === null);
      for (const blip of Array.from(run.getElementsByTagNameNS(NS_A, 'blip'))) {
        const id = blip.getAttributeNS(NS_R, 'embed');
        if (id && images.has(id)) found.push(images.get(id) as string);
      }
    }

    if (plainText(html)) {
      if (level !== null) out.push({ kind: 'heading', level, html });
      else out.push({ kind: 'p', html: isListItem ? `• ${html}` : html });
    }

    for (const path of found) {
      const ext = extensionOf(path);
      const mime = IMAGE_MIME[ext];
      const entry = zip.file(path);
      if (!mime || !entry) continue; // EMF / WMF etc. cannot be shown in a browser
      out.push({ kind: 'image', src: `data:${mime};base64,${await entry.async('base64')}` });
    }
  }

  private headingLevel(styleId: string): 1 | 2 | 3 | null {
    const id = styleId.toLowerCase();
    if (id === 'title') return 1;
    if (id === 'subtitle') return 2;
    const m = /^heading\s*([1-9])$/.exec(id);
    return m ? (Math.min(3, Number(m[1])) as 1 | 2 | 3) : null;
  }

  private docxRun(run: Element, keepFormatting: boolean): string {
    let inner = '';
    for (const child of Array.from(run.children)) {
      if (child.namespaceURI !== NS_W) continue;
      if (child.localName === 't') inner += escapeHtml(child.textContent ?? '');
      else if (child.localName === 'tab') inner += ' ';
      else if (child.localName === 'br') inner += '<br>';
    }
    if (!inner || !keepFormatting) return inner;

    const props = run.getElementsByTagNameNS(NS_W, 'rPr')[0];
    const on = (tag: string): boolean => {
      const el = props?.getElementsByTagNameNS(NS_W, tag)[0];
      if (!el) return false;
      const v = el.getAttributeNS(NS_W, 'val');
      return v !== '0' && v !== 'false' && v !== 'none';
    };
    if (on('b')) inner = `<b>${inner}</b>`;
    if (on('i')) inner = `<i>${inner}</i>`;
    if (on('u')) inner = `<u>${inner}</u>`;
    return inner;
  }

  /* -------------------------------- HTML -------------------------------- */

  private fromHtml(source: string): Item[] {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const items: Item[] = [];
    this.walkHtml(doc.body, items);
    return items;
  }

  private static readonly BLOCK_SELECTOR =
    'p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th,div,section,article,ul,ol,table,tr,tbody,thead,main,header,footer';

  private walkHtml(el: Element, out: Item[]): void {
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'head'].includes(tag)) return;

    if (tag === 'img') {
      const src = el.getAttribute('src') ?? '';
      if (/^(data:image\/|https:\/\/)/i.test(src)) out.push({ kind: 'image', src });
      return;
    }

    const heading = /^h([1-6])$/.exec(tag);
    const hasBlockChildren = !!el.querySelector(EbookImportService.BLOCK_SELECTOR) && !heading;

    if (hasBlockChildren) {
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          const html = escapeHtml((node.textContent ?? '').replace(/\s+/g, ' ').trim());
          if (html) out.push({ kind: 'p', html });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          this.walkHtml(node as Element, out);
        }
      }
      return;
    }

    const html = this.inlineHtml(el).trim();
    if (plainText(html)) {
      if (heading) out.push({ kind: 'heading', level: Math.min(3, Number(heading[1])) as 1 | 2 | 3, html });
      else out.push({ kind: 'p', html: tag === 'li' ? `• ${html}` : html });
    }
    for (const img of Array.from(el.querySelectorAll('img'))) this.walkHtml(img, out);
  }

  /** Only bold / italic / underline / line breaks survive - everything else is plain text. */
  private inlineHtml(node: Node): string {
    let html = '';
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        html += escapeHtml((child.textContent ?? '').replace(/\s+/g, ' '));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toLowerCase();
        const inner = this.inlineHtml(el);
        if (tag === 'b' || tag === 'strong') html += `<b>${inner}</b>`;
        else if (tag === 'i' || tag === 'em') html += `<i>${inner}</i>`;
        else if (tag === 'u') html += `<u>${inner}</u>`;
        else if (tag === 'br') html += '<br>';
        else if (!['img', 'script', 'style'].includes(tag)) html += inner;
      }
    }
    return html;
  }

  /* ----------------------------- TXT / Markdown ----------------------------- */

  private fromPlainText(source: string): Item[] {
    const items: Item[] = [];
    for (const chunk of source.split(/\r?\n\s*\r?\n/)) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
      if (heading && !trimmed.includes('\n')) {
        items.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, html: escapeHtml(heading[2]) });
      } else {
        items.push({ kind: 'p', html: escapeHtml(trimmed).replace(/\r?\n/g, '<br>') });
      }
    }
    return items;
  }
}
