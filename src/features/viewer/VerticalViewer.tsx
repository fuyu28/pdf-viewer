import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { usePdf } from "../pdf/PdfProvider";
import { PageCanvas } from "../pdf/PageCanvas";
import { useViewerStore } from "./viewerStore";

export function VerticalViewer() {
  const DEFAULT_PAGE_RATIO = 1.4142;
  const PAGE_MAX_WIDTH = 1024;
  const SPREAD_GAP = 12;

  const parentRef = useRef<HTMLDivElement | null>(null);
  const suppressObserverUntilRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [pageRatios, setPageRatios] = useState<Record<number, number>>({});

  const { numPages, getPageSize } = usePdf();
  const totalPages = Math.max(1, numPages);
  const currentPage = useViewerStore((state) => state.currentPage);
  const zoomScale = useViewerStore((state) => state.zoomScale);
  const isSpreadMode = useViewerStore((state) => state.isSpreadMode);
  const setCurrentPage = useViewerStore((state) => state.setCurrentPage);
  const setGoToPageImpl = useViewerStore((state) => state.setGoToPageImpl);

  const pagesPerRow = isSpreadMode ? 2 : 1;
  const totalRows = Math.max(1, Math.ceil(totalPages / pagesPerRow));

  const pageToRowIndex = useCallback(
    (page: number) => Math.floor((Math.max(1, page) - 1) / pagesPerRow),
    [pagesPerRow],
  );

  const rowToPages = useCallback(
    (rowIndex: number) => {
      const first = rowIndex * pagesPerRow + 1;
      if (first > totalPages) {
        return [totalPages];
      }
      if (!isSpreadMode) {
        return [first];
      }
      const second = first + 1;
      return second <= totalPages ? [first, second] : [first];
    },
    [isSpreadMode, pagesPerRow, totalPages],
  );

  const rowToDisplayPages = useCallback(
    (rowIndex: number) => {
      const pages = rowToPages(rowIndex);
      if (!isSpreadMode || pages.length < 2) {
        return pages;
      }
      return [pages[1], pages[0]];
    },
    [isSpreadMode, rowToPages],
  );

  const readerWidth = useMemo(() => {
    const viewportWidth = containerWidth > 0 ? containerWidth - 8 : 800;
    const viewportHeight = containerHeight > 0 ? containerHeight : 1000;
    const currentRowPages = rowToPages(pageToRowIndex(currentPage));
    const currentRatio = Math.max(
      ...currentRowPages.map((page) => pageRatios[page] ?? DEFAULT_PAGE_RATIO),
    );
    const fitByHeight = Math.max(220, (viewportHeight - 12) / currentRatio);
    const widthGap = isSpreadMode ? SPREAD_GAP : 0;
    const fitByWidth = Math.max(220, (viewportWidth - widthGap) / pagesPerRow);
    const fitWidth = Math.min(PAGE_MAX_WIDTH, fitByWidth, fitByHeight);
    return Math.max(180, fitWidth * zoomScale);
  }, [
    containerHeight,
    containerWidth,
    currentPage,
    isSpreadMode,
    pageRatios,
    pageToRowIndex,
    pagesPerRow,
    rowToPages,
    zoomScale,
  ]);

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const rowPages = rowToPages(index);
      const rowRatio = Math.max(...rowPages.map((page) => pageRatios[page] ?? DEFAULT_PAGE_RATIO));
      return Math.ceil(readerWidth * rowRatio);
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

    if (container.scrollTop <= 2) {
      setCurrentPage(1);
      return;
    }

    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
      setCurrentPage(totalPages);
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

    const rowPages = rowToPages(closest.index);
    if (rowPages.includes(currentPage)) {
      setCurrentPage(currentPage);
      return;
    }

    setCurrentPage(Math.min(...rowPages));
  }, [currentPage, rowToPages, rowVirtualizer, setCurrentPage, totalPages]);

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
      setContainerHeight(entry.contentRect.height);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    const visiblePages = virtualItems.flatMap((item) => rowToPages(item.index));

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
  }, [getPageSize, pageRatios, rowToPages, virtualItems]);

  useEffect(() => {
    rowVirtualizer.measure();
  }, [isSpreadMode, pageRatios, readerWidth, rowVirtualizer]);

  useEffect(() => {
    setGoToPageImpl((page) => {
      suppressObserverUntilRef.current = Date.now() + 350;
      rowVirtualizer.scrollToIndex(pageToRowIndex(page), {
        align: "start",
        behavior: "auto",
      });
    });

    return () => setGoToPageImpl(null);
  }, [pageToRowIndex, rowVirtualizer, setGoToPageImpl]);

  useEffect(() => {
    suppressObserverUntilRef.current = Date.now() + 350;
    rowVirtualizer.scrollToIndex(pageToRowIndex(currentPage), {
      align: "start",
      behavior: "auto",
    });
  }, [currentPage, pageToRowIndex, rowVirtualizer]);

  return (
    <div
      ref={parentRef}
      data-active-scroll="true"
      className="h-full overflow-auto px-2 pb-16 pt-3 md:px-4"
      onScroll={applyCurrentPageFromViewport}
    >
      <div
        className="relative mx-auto w-full"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualRow) => {
          const displayPages = rowToDisplayPages(virtualRow.index);
          const logicalPages = rowToPages(virtualRow.index);
          const isNear = logicalPages.some((page) => Math.abs(page - currentPage) <= 3);
          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 flex w-full justify-center"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <div className="flex w-fit gap-3">
                {displayPages.map((pageNumber) => {
                  const ratio = pageRatios[pageNumber] ?? DEFAULT_PAGE_RATIO;
                  return isNear ? (
                    <PageCanvas
                      key={pageNumber}
                      pageNumber={pageNumber}
                      scale={1}
                      className="mx-auto"
                      fixedWidth={readerWidth}
                    />
                  ) : (
                    <div
                      key={pageNumber}
                      className="mx-auto rounded-md border border-dashed bg-muted/40"
                      style={{
                        width: `${Math.floor(readerWidth)}px`,
                        height: `${Math.floor(readerWidth * ratio)}px`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
