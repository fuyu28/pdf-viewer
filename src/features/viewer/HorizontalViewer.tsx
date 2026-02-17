import { useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

import { PageCanvas } from "../pdf/PageCanvas";
import { usePdf } from "../pdf/PdfProvider";
import { useViewerStore } from "./viewerStore";

export function HorizontalViewer() {
  const DEFAULT_PAGE_RATIO = 1.4142;
  const PAGE_MAX_WIDTH = 1024;

  const parentRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [pageRatios, setPageRatios] = useState<Record<number, number>>({});

  const { numPages, getPageSize } = usePdf();
  const totalPages = Math.max(1, numPages);
  const currentPage = useViewerStore((state) => state.currentPage);
  const zoomScale = useViewerStore((state) => state.zoomScale);
  const setCurrentPage = useViewerStore((state) => state.setCurrentPage);
  const setGoToPageImpl = useViewerStore((state) => state.setGoToPageImpl);

  const pageWidth = useMemo(() => {
    const viewportWidth = containerWidth > 0 ? containerWidth - 8 : 800;
    const viewportHeight = containerHeight > 0 ? containerHeight : 1000;
    const currentRatio = pageRatios[currentPage] ?? DEFAULT_PAGE_RATIO;
    const fitByHeight = Math.max(280, (viewportHeight - 12) / currentRatio);
    const fitWidth = Math.min(PAGE_MAX_WIDTH, viewportWidth, fitByHeight);
    return Math.max(220, fitWidth * zoomScale);
  }, [containerHeight, containerWidth, currentPage, pageRatios, zoomScale]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    dragFree: false,
    skipSnaps: false,
  });

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const onSelect = () => {
      setCurrentPage(emblaApi.selectedScrollSnap() + 1);
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, setCurrentPage]);

  useEffect(() => {
    if (!emblaApi) {
      setGoToPageImpl(null);
      return;
    }

    setGoToPageImpl((page) => {
      emblaApi.scrollTo(page - 1);
    });

    return () => setGoToPageImpl(null);
  }, [emblaApi, setGoToPageImpl]);

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
    const targetPages = [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ];

    for (const page of targetPages) {
      if (page < 1 || page > numPages || pageRatios[page] !== undefined) {
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
  }, [currentPage, getPageSize, numPages, pageRatios]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    emblaApi.scrollTo(currentPage - 1, true);
    // 初期同期のみ必要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, currentPage]);

  return (
    <div ref={parentRef} className="h-full overflow-hidden px-2 pb-16 pt-3 md:px-4">
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;
            const isNear = Math.abs(pageNumber - currentPage) <= 2;
            const ratio = pageRatios[pageNumber] ?? DEFAULT_PAGE_RATIO;
            return (
              <div key={pageNumber} className="h-full min-w-0 flex-[0_0_100%]">
                <div
                  data-active-scroll={pageNumber === currentPage ? "true" : "false"}
                  className="mx-auto h-full max-w-5xl overflow-auto pb-4"
                >
                  {isNear ? (
                    <PageCanvas
                      pageNumber={pageNumber}
                      scale={1}
                      className="mx-auto"
                      fixedWidth={pageWidth}
                    />
                  ) : (
                    <div
                      className="mx-auto rounded-md border border-dashed bg-muted/40"
                      style={{
                        width: `${Math.floor(pageWidth)}px`,
                        height: `${Math.floor(pageWidth * ratio)}px`,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
