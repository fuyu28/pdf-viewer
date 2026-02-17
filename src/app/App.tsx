import { useEffect, useMemo, useState } from "react";
import { BookOpen, Menu, Rows3, UnfoldVertical } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { PdfProvider, usePdf } from "../features/pdf/PdfProvider";
import { useBookStore } from "../features/book/bookStore";
import { BookInfoDialog } from "../features/book/BookInfoDialog";
import { NavPanel } from "../features/nav/NavPanel";
import { NavSheet } from "../features/nav/NavSheet";
import { HorizontalViewer } from "../features/viewer/HorizontalViewer";
import { useViewerStore } from "../features/viewer/viewerStore";
import { VerticalViewer } from "../features/viewer/VerticalViewer";
import { useMediaQuery } from "../shared/hooks/useMediaQuery";

const PDF_URL = "/pdf/3000000149.pdf";

function ViewerArea() {
  const mode = useViewerStore((state) => state.mode);
  const currentPage = useViewerStore((state) => state.currentPage);
  const setMode = useViewerStore((state) => state.setMode);
  const goToPage = useViewerStore((state) => state.goToPage);

  const { numPages, isLoading, error } = usePdf();
  const { book, fetchBook, isLoading: isBookLoading, error: bookError } = useBookStore();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    void fetchBook();
  }, [fetchBook]);

  const title = useMemo(() => book?.title ?? "PDF Viewer", [book?.title]);

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-white/90 px-3 backdrop-blur md:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {!isDesktop ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsNavOpen(true)}
                aria-label="ナビを開く"
              >
                <Menu className="h-5 w-5" />
              </Button>
            ) : null}
            <h1 className="truncate text-sm font-semibold md:text-base">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {currentPage} / {Math.max(1, numPages)}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setIsInfoOpen(true)}>
              <BookOpen className="mr-1 h-4 w-4" />
              Info
            </Button>
          </div>
        </header>

        <main className="relative min-h-0 flex-1">
          {isLoading ? (
            <div className="grid h-full place-content-center text-sm text-muted-foreground">
              PDF を読み込み中...
            </div>
          ) : error ? (
            <div className="grid h-full place-content-center px-4 text-sm text-destructive">
              {error}
            </div>
          ) : mode === "vertical" ? (
            <VerticalViewer />
          ) : (
            <HorizontalViewer />
          )}

          <div className="pointer-events-none absolute left-3 top-3 sm:hidden">
            <Badge variant="secondary" className="pointer-events-auto">
              {currentPage} / {Math.max(1, numPages)}
            </Badge>
          </div>

          <Button
            size="icon"
            className="fixed bottom-5 right-5 z-30 h-12 w-12 rounded-full shadow-lg"
            onClick={() => {
              const nextMode = mode === "vertical" ? "horizontal" : "vertical";
              setMode(nextMode);
              goToPage(currentPage);
            }}
            aria-label="表示モード切替"
          >
            {mode === "vertical" ? (
              <Rows3 className="h-5 w-5" />
            ) : (
              <UnfoldVertical className="h-5 w-5" />
            )}
          </Button>
        </main>
      </div>

      {isDesktop ? (
        <aside className="hidden w-80 border-l bg-white p-4 md:block">
          <NavPanel
            book={book}
            currentPage={currentPage}
            totalPages={numPages}
            onGoToPage={goToPage}
            onOpenInfo={() => setIsInfoOpen(true)}
          />
          {isBookLoading ? (
            <p className="mt-3 text-xs text-muted-foreground">book.json 読み込み中...</p>
          ) : null}
          {bookError ? <p className="mt-3 text-xs text-destructive">{bookError}</p> : null}
        </aside>
      ) : (
        <NavSheet
          open={isNavOpen}
          onOpenChange={setIsNavOpen}
          book={book}
          currentPage={currentPage}
          totalPages={numPages}
          onGoToPage={goToPage}
          onOpenInfo={() => setIsInfoOpen(true)}
        />
      )}

      <BookInfoDialog book={book} open={isInfoOpen} onOpenChange={setIsInfoOpen} />
      {!isDesktop && (isBookLoading || bookError) ? (
        <div className="fixed bottom-4 left-4 z-30 rounded-md border bg-white/90 px-3 py-1 text-xs backdrop-blur">
          {isBookLoading ? "book.json 読み込み中..." : bookError}
        </div>
      ) : null}
    </div>
  );
}

export function App() {
  return (
    <PdfProvider url={PDF_URL}>
      <ViewerArea />
    </PdfProvider>
  );
}
