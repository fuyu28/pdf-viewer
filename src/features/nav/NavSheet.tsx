import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import type { BookMeta } from "../book/bookStore";
import { NavPanel } from "./NavPanel";

type NavSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: BookMeta | null;
  currentPage: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
  onOpenInfo: () => void;
};

export function NavSheet({
  open,
  onOpenChange,
  book,
  currentPage,
  totalPages,
  onGoToPage,
  onOpenInfo,
}: NavSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[90vw] p-4">
        <SheetHeader>
          <SheetTitle>目次 / ジャンプ</SheetTitle>
        </SheetHeader>
        <div className="mt-4 h-[calc(100%-2.5rem)]">
          <NavPanel
            compact
            book={book}
            currentPage={currentPage}
            totalPages={totalPages}
            onGoToPage={(page) => {
              onGoToPage(page);
              onOpenChange(false);
            }}
            onOpenInfo={() => {
              onOpenInfo();
              onOpenChange(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
