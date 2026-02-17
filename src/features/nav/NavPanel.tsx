import { BookOpenText } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import type { BookMeta } from "../book/bookStore";
import { PageJump } from "./PageJump";
import { TocList } from "./TocList";

type NavPanelProps = {
  book: BookMeta | null;
  currentPage: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
  onOpenInfo: () => void;
  compact?: boolean;
};

export function NavPanel({
  book,
  currentPage,
  totalPages,
  onGoToPage,
  onOpenInfo,
  compact = false,
}: NavPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">ナビゲーション</h2>
        <Badge variant="secondary">
          {currentPage} / {Math.max(1, totalPages)}
        </Badge>
      </div>

      <Button variant="outline" className="justify-start" onClick={onOpenInfo}>
        <BookOpenText className="mr-2 h-4 w-4" />
        本情報
      </Button>

      <Separator />

      <PageJump
        currentPage={currentPage}
        totalPages={Math.max(1, totalPages)}
        onJump={onGoToPage}
      />
      <TocList
        className="min-h-0 flex-1 pb-16"
        toc={book?.tableOfContents ?? []}
        onSelect={onGoToPage}
      />

      {!book && compact ? (
        <p className="text-xs text-muted-foreground">book.json の読み込み待機中</p>
      ) : null}
    </div>
  );
}
