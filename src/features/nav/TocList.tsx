import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import type { TocItem } from "../book/bookStore";

type TocListProps = {
  toc: TocItem[];
  onSelect: (page: number) => void;
  className?: string;
};

export function TocList({ toc, onSelect, className }: TocListProps) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col space-y-2 ${className ?? ""}`}>
      <h3 className="text-sm font-semibold">目次</h3>
      <ScrollArea className="min-h-0 flex-1 rounded-md border bg-background p-2">
        <div className="space-y-1">
          {toc.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-2 py-2 text-left"
              onClick={() => onSelect(item.page)}
            >
              <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground/80">
                {item.page}p
              </span>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
