import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import type { BookMeta } from "./bookStore";

type BookInfoDialogProps = {
  book: BookMeta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ValueRow({ label, value }: { label: string; value: string }) {
  const muted = value.trim() === "-";
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className={muted ? "text-muted-foreground" : ""}>{value}</p>
    </div>
  );
}

export function BookInfoDialog({ book, open, onOpenChange }: BookInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>本の情報</DialogTitle>
          <DialogDescription>{book?.title ?? "book.json が読み込まれていません"}</DialogDescription>
        </DialogHeader>

        {book ? (
          <div className="space-y-3">
            <ValueRow label="タイトル" value={book.title} />
            <ValueRow label="著者" value={book.authors} />
            <ValueRow label="出版社" value={book.publisher} />
            <ValueRow label="出版日" value={book.publicationDate} />
            <ValueRow label="言語" value={book.language} />
            <ValueRow label="ページ数" value={book.pageCount} />
            <ValueRow label="ISBN" value={book.isbn} />
            <ValueRow label="eISBN" value={book.eisbn} />
            <ValueRow label="ジャンル" value={book.genre} />
            <ValueRow label="NDC" value={book.ndcClass} />
            <ValueRow label="subject" value={book.subject} />
            <ValueRow label="content_id" value={book.contentId} />
            <ValueRow label="購入後DL" value={book.downloadableAfterPurchase} />

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">説明</p>
              <ScrollArea className="h-40 rounded-md border bg-muted/20 p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{book.description}</p>
              </ScrollArea>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
