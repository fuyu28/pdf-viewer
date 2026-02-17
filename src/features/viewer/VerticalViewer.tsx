import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { usePdf } from "../pdf/PdfProvider";
import { PageCanvas } from "../pdf/PageCanvas";
import { useViewerStore } from "./viewerStore";

export function VerticalViewer() {
  const DEFAULT_PAGE_RATIO = 1.4142;
  const PAGE_MAX_WIDTH = 1024;

  const parentRef = useRef<HTMLDivElement | null>(null);
  const suppressObserverUntilRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageRatios, setPageRatios] = useState<Record<number, number>>({});

  const { numPages, getPageSize } = usePdf();
  const currentPage = useViewerStore((state) => state.currentPage);
  const setCurrentPage = useViewerStore((state) => state.setCurrentPage);
  const setGoToPageImpl = useViewerStore((state) => state.setGoToPageImpl);
  const readerWidth = useMemo(() => {
    const available = containerWidth > 0 ? containerWidth - 8 : 800;
    return Math.max(280, Math.min(PAGE_MAX_WIDTH, available));
  }, [containerWidth]);

  const rowVirtualizer = useVirtualizer({
    count: Math.max(1, numPages),
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const ratio = pageRatios[index + 1] ?? DEFAULT_PAGE_RATIO;
      return Math.ceil(readerWidth * ratio);
    },
    overscan: 2,
    gap: 4,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  const applyCurrentPageFromViewport = useCallback(() => {
    const container = parentRef.current;
    if (!container) {
      return;
    }

    const atTop = container.scrollTop <= 2;
    if (atTop) {
      setCurrentPage(1);
      return;
    }

    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
    if (atBottom) {
      setCurrentPage(Math.max(1, numPages));
      return;
    }

    if (Date.now() < suppressObserverUntilRef.current) {
      return;
    }

    const items = rowVirtualizer.getVirtualItems();
    if (items.length === 0) {
      return;
    }

    const centerOffset = (rowVirtualizer.scrollOffset ?? 0) + container.clientHeight / 2;
    const closest = items.reduce((best, item) => {
      const itemCenter = item.start + item.size / 2;
      const bestDistance = Math.abs(best.start + best.size / 2 - centerOffset);
      const nextDistance = Math.abs(itemCenter - centerOffset);
      return nextDistance < bestDistance ? item : best;
    });

    setCurrentPage(closest.index + 1);
  }, [numPages, rowVirtualizer, setCurrentPage]);

  useEffect(() => {
    const element = parentRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    const visiblePages = virtualItems.map((item) => item.index + 1);

    for (const page of visiblePages) {
      if (pageRatios[page] !== undefined) {
        continue;
      }

      void getPageSize(page).then(({ width, height }) => {
        if (!active || width <= 0) {
          return;
        }
        const ratio = height / width;
        setPageRatios((prev) => {
          if (prev[page] !== undefined) {
            return prev;
          }
          return { ...prev, [page]: ratio };
        });
      });
    }

    return () => {
      active = false;
    };
  }, [getPageSize, pageRatios, virtualItems]);

  useEffect(() => {
    rowVirtualizer.measure();
  }, [pageRatios, readerWidth, rowVirtualizer]);

  useEffect(() => {
    setGoToPageImpl((page) => {
      suppressObserverUntilRef.current = Date.now() + 350;
      rowVirtualizer.scrollToIndex(page - 1, {
        align: "start",
        behavior: "auto",
      });
    });

    return () => setGoToPageImpl(null);
  }, [rowVirtualizer, setGoToPageImpl]);

  useEffect(() => {
    suppressObserverUntilRef.current = Date.now() + 350;
    rowVirtualizer.scrollToIndex(currentPage - 1, {
      align: "start",
      behavior: "auto",
    });
    // 初期同期のみ必要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto px-2 pb-16 pt-3 md:px-4"
      onScroll={applyCurrentPageFromViewport}
    >
      <div
        className="relative mx-auto w-full max-w-5xl"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualRow) => {
          const pageNumber = virtualRow.index + 1;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 flex w-full justify-center"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <PageCanvas pageNumber={pageNumber} scale={1} className="w-full" fixedWidth={readerWidth} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
