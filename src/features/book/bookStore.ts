import { create } from "zustand";
import { z } from "zod";

const TocItemSchema = z.object({
  chapter: z.string().min(1),
  page: z.number().int().positive(),
});

const RawBookSchema = z.object({
  title: z.string(),
  authors: z.string(),
  publisher: z.string(),
  publication_country: z.string(),
  language: z.string(),
  publication_date: z.string(),
  page_count: z.string(),
  isbn: z.string(),
  eisbn: z.string(),
  genre: z.string(),
  ndc_class: z.string(),
  subject: z.string(),
  content_id: z.string(),
  downloadable_after_purchase: z.string(),
  description: z.string(),
  table_of_contents: z.array(TocItemSchema),
});

export type TocItem = {
  id: string;
  title: string;
  page: number;
};

export type BookMeta = {
  title: string;
  authors: string;
  publisher: string;
  publicationCountry: string;
  language: string;
  publicationDate: string;
  pageCount: string;
  isbn: string;
  eisbn: string;
  genre: string;
  ndcClass: string;
  subject: string;
  contentId: string;
  downloadableAfterPurchase: string;
  description: string;
  tableOfContents: TocItem[];
};

type BookStore = {
  book: BookMeta | null;
  isLoading: boolean;
  error: string | null;
  fetchBook: (jsonPath: string) => Promise<void>;
};

function normalizeBook(raw: z.infer<typeof RawBookSchema>): BookMeta {
  return {
    title: raw.title,
    authors: raw.authors,
    publisher: raw.publisher,
    publicationCountry: raw.publication_country,
    language: raw.language,
    publicationDate: raw.publication_date,
    pageCount: raw.page_count,
    isbn: raw.isbn,
    eisbn: raw.eisbn,
    genre: raw.genre,
    ndcClass: raw.ndc_class,
    subject: raw.subject,
    contentId: raw.content_id,
    downloadableAfterPurchase: raw.downloadable_after_purchase,
    description: raw.description,
    tableOfContents: raw.table_of_contents.map((item) => ({
      id: `${item.chapter}-${item.page}`,
      title: item.chapter,
      page: item.page,
    })),
  };
}

export const useBookStore = create<BookStore>((set) => ({
  book: null,
  isLoading: false,
  error: null,
  fetchBook: async (jsonPath) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(jsonPath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`${jsonPath} の読み込みに失敗しました (${response.status})`);
      }

      const json = await response.json();
      const parsed = RawBookSchema.parse(json);
      set({ book: normalizeBook(parsed), isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : `${jsonPath} の解析に失敗しました`;
      set({ error: message, isLoading: false });
    }
  },
}));
