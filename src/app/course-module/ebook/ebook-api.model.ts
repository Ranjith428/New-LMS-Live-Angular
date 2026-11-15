
/** Row of Organize Modules / a content tab - no content. */
export interface EbookSummary {
  id: number;
  courseId: number;
  sectionId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Full ebook: for the editor and the reader. */
export interface EbookRecord extends EbookSummary {
  /** JSON array of ebook sections, as text. */
  content: string;
}

/** Ebook Name rules (same as the multimedia Resource Name): required, 4..100 characters. */
export const EBOOK_NAME_MIN = 4;
export const EBOOK_NAME_MAX = 100;

/** The backend refuses content above app.ebook.max-content-mb (25 MB by default). */
export const EBOOK_MAX_CONTENT_CHARS = 25 * 1024 * 1024;