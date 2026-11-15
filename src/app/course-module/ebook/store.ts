import { Injectable, computed, signal } from '@angular/core';
import {
  Block,
  ImageBlock,
  Section,
  Selection,
  ShadowPreset,
  TextBlock,
  image,
  text,
  uid,
} from './models';
import { initialSections } from './templates';

const SHADOW_PRESETS: Record<ShadowPreset, { x: number | null; y: number | null; blur: number | null }> = {
  none: { x: null, y: null, blur: null },
  left: { x: -2, y: 0, blur: 2 },
  right: { x: 2, y: 0, blur: 2 },
  bottom: { x: 0, y: 2, blur: 2 },
  round: { x: 0, y: 0, blur: 4 },
};

/** Provided by <app-ebook-editor>, so every visit starts with a fresh page. */
@Injectable()
export class EbookStore {
  readonly sections = signal<Section[]>(initialSections());
  readonly selection = signal<Selection | null>(null);
  /** page of the property panel (the ◀ ▶ buttons) */
  readonly page = signal(0);
  readonly tab = signal<'text' | 'layouts'>('text');
  readonly addModal = signal<{ index: number } | null>(null);
  readonly modalCategory = signal('covers');

  readonly selectedSection = computed(() => {
    const sel = this.selection();
    return sel ? (this.sections().find((s) => s.id === sel.sectionId) ?? null) : null;
  });

  readonly selectedBlock = computed<Block | null>(() => {
    const sel = this.selection();
    const sec = this.selectedSection();
    if (!sel?.blockId || !sec) return null;
    return sec.blocks.find((b) => b.id === sel.blockId) ?? null;
  });

  readonly selectedText = computed(() => {
    const b = this.selectedBlock();
    return b?.kind === 'text' ? b : null;
  });

  readonly selectedImage = computed(() => {
    const b = this.selectedBlock();
    return b?.kind === 'image' ? b : null;
  });

  constructor() {
    // The Figma frame opens with the first heading selected.
    const first = this.sections()[0];
    this.selection.set({ kind: 'text', sectionId: first.id, blockId: first.blocks[0].id });
  }

  readonly pageCount = computed(() => (this.selection() ? 2 : 1));

  /* ----------------------------- selection ----------------------------- */
  select(sel: Selection | null) {
    this.selection.set(sel);
    this.page.set(0);
    if (sel) this.tab.set('text');
  }
  nextPage() {
    this.page.update((p) => Math.min(this.pageCount() - 1, p + 1));
  }
  prevPage() {
    this.page.update((p) => Math.max(0, p - 1));
  }

  /* ------------------------------ updates ------------------------------ */
  private mapSection(id: string, fn: (s: Section) => Section) {
    this.sections.update((all) => all.map((s) => (s.id === id ? fn(s) : s)));
  }

  updateSection(patch: Partial<Section>) {
    const sel = this.selection();
    if (!sel) return;
    this.mapSection(sel.sectionId, (s) => ({ ...s, ...patch }));
  }

  updateText(patch: Partial<TextBlock>) {
    const sel = this.selection();
    if (sel?.kind !== 'text' || !sel.blockId) return;
    this.mapSection(sel.sectionId, (s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === sel.blockId && b.kind === 'text' ? { ...b, ...patch } : b)),
    }));
  }

  updateImage(patch: Partial<ImageBlock>) {
    const sel = this.selection();
    if (sel?.kind !== 'image' || !sel.blockId) return;
    this.mapSection(sel.sectionId, (s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === sel.blockId && b.kind === 'image' ? { ...b, ...patch } : b)),
    }));
  }

  applyShadowPreset(preset: ShadowPreset) {
    const cur = this.selectedText();
    if (!cur) return;
    this.updateText({ shadow: { ...cur.shadow, preset, ...SHADOW_PRESETS[preset] } });
  }

  /** Reads an uploaded image file as a data URL. */
  readFile(file: File | undefined | null): Promise<string> {
    return new Promise((resolve) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.readAsDataURL(file);
    });
  }

  /* ----------------------------- structure ----------------------------- */
  addBlock(kind: 'text' | 'image') {
    const sel = this.selection();
    if (!sel) return;
    const block = kind === 'text' ? text('p', '') : image();
    this.mapSection(sel.sectionId, (s) => ({ ...s, blocks: [...s.blocks, block] }));
    this.select({ kind, sectionId: sel.sectionId, blockId: block.id });
  }

  private cloneBlock<T extends Block>(b: T): T {
    return { ...structuredClone(b), id: uid(b.kind === 'text' ? 't' : 'i') };
  }

  duplicateBlock() {
    const sel = this.selection();
    const b = this.selectedBlock();
    if (!sel || !b) return;
    const copy = this.cloneBlock(b);
    this.mapSection(sel.sectionId, (s) => {
      const i = s.blocks.findIndex((x) => x.id === b.id);
      const blocks = [...s.blocks];
      blocks.splice(i + 1, 0, copy);
      return { ...s, blocks };
    });
    this.select({ kind: sel.kind, sectionId: sel.sectionId, blockId: copy.id });
  }

  deleteBlock() {
    const sel = this.selection();
    if (!sel?.blockId) return;
    this.mapSection(sel.sectionId, (s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== sel.blockId) }));
    this.select({ kind: 'section', sectionId: sel.sectionId });
  }

  moveSection(sectionId: string, dir: -1 | 1) {
    this.sections.update((all) => {
      const i = all.findIndex((s) => s.id === sectionId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  duplicateSection(sectionId: string) {
    const all = this.sections();
    const i = all.findIndex((s) => s.id === sectionId);
    if (i < 0) return;
    const copy: Section = {
      ...structuredClone(all[i]),
      id: uid('s'),
      blocks: all[i].blocks.map((b) => this.cloneBlock(b)),
    };
    const next = [...all];
    next.splice(i + 1, 0, copy);
    this.sections.set(next);
    this.select({ kind: 'section', sectionId: copy.id });
  }

  deleteSection(sectionId: string) {
    this.sections.update((all) => all.filter((s) => s.id !== sectionId));
    this.select(null);
  }

  deleteSelected() {
    const sel = this.selection();
    if (!sel) return;
    if (sel.kind === 'section') this.deleteSection(sel.sectionId);
    else this.deleteBlock();
  }

  /* ----------------------------- add section ---------------------------- */
  openAddSection(index: number, category?: string) {
    if (category) this.modalCategory.set(category);
    this.addModal.set({ index });
  }
  closeAddSection() {
    this.addModal.set(null);
  }
  insertSection(build: () => Section) {
    const m = this.addModal();
    if (!m) return;
    const sec = build();
    this.sections.update((all) => {
      const next = [...all];
      next.splice(Math.min(m.index, next.length), 0, sec);
      return next;
    });
    this.closeAddSection();
    this.select({ kind: 'section', sectionId: sec.id });
  }
}
