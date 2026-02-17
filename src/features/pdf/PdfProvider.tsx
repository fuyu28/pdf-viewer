import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";

import { useViewerStore } from "../viewer/viewerStore";

type PdfContextValue = {
  doc: PDFDocumentProxy | null;
  numPages: number;
  isLoading: boolean;
  error: string | null;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  getPageSize: (pageNumber: number) => Promise<{ width: number; height: number }>;
};

const PdfContext = createContext<PdfContextValue | null>(null);

type PdfProviderProps = {
  url: string;
  children: ReactNode;
};

export function PdfProvider({ url, children }: PdfProviderProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageCacheRef = useRef<Map<number, Promise<PDFPageProxy>>>(new Map());
  const pageSizeCacheRef = useRef<Map<number, Promise<{ width: number; height: number }>>>(
    new Map(),
  );
  const setNumPages = useViewerStore((state) => state.setNumPages);

  useEffect(() => {
    let isMounted = true;
    const loadingTask = getDocument(url);

    setIsLoading(true);
    setError(null);
    pageCacheRef.current.clear();
    pageSizeCacheRef.current.clear();

    loadingTask.promise
      .then((loadedDoc) => {
        if (!isMounted) {
          void loadedDoc.destroy();
          return;
        }

        setDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
      })
      .catch((loadError: unknown) => {
        if (!isMounted) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : "PDF の読み込みに失敗しました";
        setError(message);
        setDoc(null);
        setNumPages(1);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      loadingTask.destroy();
      setDoc((current) => {
        if (current) {
          void current.destroy();
        }
        return null;
      });
    };
  }, [setNumPages, url]);

  const getPage = useCallback(
    (pageNumber: number) => {
      if (!doc) {
        return Promise.reject(new Error("PDF is not ready"));
      }

      const cached = pageCacheRef.current.get(pageNumber);
      if (cached) {
        return cached;
      }

      const request = doc.getPage(pageNumber);
      pageCacheRef.current.set(pageNumber, request);
      return request;
    },
    [doc],
  );

  const getPageSize = useCallback(
    async (pageNumber: number) => {
      const cached = pageSizeCacheRef.current.get(pageNumber);
      if (cached) {
        return cached;
      }

      const request = getPage(pageNumber).then((page) => {
        const viewport = page.getViewport({ scale: 1 });
        return {
          width: viewport.width,
          height: viewport.height,
        };
      });

      pageSizeCacheRef.current.set(pageNumber, request);
      return request;
    },
    [getPage],
  );

  const value = useMemo<PdfContextValue>(
    () => ({
      doc,
      numPages: doc?.numPages ?? 0,
      isLoading,
      error,
      getPage,
      getPageSize,
    }),
    [doc, error, getPage, getPageSize, isLoading],
  );

  return <PdfContext.Provider value={value}>{children}</PdfContext.Provider>;
}

export function usePdf() {
  const context = useContext(PdfContext);
  if (!context) {
    throw new Error("usePdf must be used inside PdfProvider");
  }
  return context;
}
