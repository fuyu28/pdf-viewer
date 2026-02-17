import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import type { TocItem } from "../book/bookStore";

type TocListProps = {
  toc: TocItem[];
  onSelect: (page: number) => void;
};

export function TocList({ toc, onSelect }: TocListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">目次</h3>
      <ScrollArea className="h-[280px] rounded-md border bg-background p-2">
        <div className="space-y-1">
          {toc.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="h-auto w-full justify-between px-2 py-2 text-left"
              onClick={() => onSelect(item.page)}
            >
              <span className="truncate">{item.title}</span>
              <span className="text-xs text-muted-foreground">p.{item.page}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
