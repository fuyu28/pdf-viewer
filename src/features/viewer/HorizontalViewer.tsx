import { useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

import { PageCanvas } from "../pdf/PageCanvas";
import { usePdf } from "../pdf/PdfProvider";
import { useViewerStore } from "./viewerStore";

export function HorizontalViewer() {
  const DEFAULT_PAGE_RATIO = 1.4142;
  const PAGE_MAX_WIDTH = 1024;
  const SPREAD_GAP = 12;

  const parentRef = useRef<HTMLDivElement | null>(null);
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
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const pagesPerSlide = isSpreadMode ? 2 : 1;
  const totalSlides = Math.max(1, Math.ceil(totalPages / pagesPerSlide));
  const pageToSlideIndex = (page: number) => Math.floor((Math.max(1, page) - 1) / pagesPerSlide);
  const slideToFirstPage = (slideIndex: number) => slideIndex * pagesPerSlide + 1;

  const pageWidth = useMemo(() => {
    const viewportWidth = containerWidth > 0 ? containerWidth - 8 : 800;
    const viewportHeight = containerHeight > 0 ? containerHeight : 1000;
    const currentRatio = pageRatios[currentPage] ?? DEFAULT_PAGE_RATIO;
    const fitByHeight = Math.max(280, (viewportHeight - 12) / currentRatio);
    const spreadGap = isSpreadMode ? SPREAD_GAP : 0;
    const fitByWidth = (viewportWidth - spreadGap) / pagesPerSlide;
    const fitWidth = Math.min(PAGE_MAX_WIDTH, fitByWidth, fitByHeight);
    return Math.max(220, fitWidth * zoomScale);
  }, [
    containerHeight,
    containerWidth,
    currentPage,
    isSpreadMode,
    pageRatios,
    pagesPerSlide,
    zoomScale,
  ]);

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
      const slideIndex = emblaApi.selectedScrollSnap();
      if (!isSpreadMode) {
        setCurrentPage(slideToFirstPage(slideIndex));
        return;
      }

      const first = slideToFirstPage(slideIndex);
      const second = first + 1 <= totalPages ? first + 1 : null;
      const previous = currentPageRef.current;
      if (previous === first || previous === second) {
        setCurrentPage(previous);
      } else {
        setCurrentPage(first);
      }
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, isSpreadMode, setCurrentPage, totalPages]);

  useEffect(() => {
    if (!emblaApi) {
      setGoToPageImpl(null);
      return;
    }

    setGoToPageImpl((page) => {
      emblaApi.scrollTo(pageToSlideIndex(page));
    });

    return () => setGoToPageImpl(null);
  }, [emblaApi, pagesPerSlide, setGoToPageImpl]);

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
    const targetPages = isSpreadMode
      ? [
          currentPage - 3,
          currentPage - 2,
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2,
          currentPage + 3,
        ]
      : [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];

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
  }, [currentPage, getPageSize, isSpreadMode, numPages, pageRatios]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    emblaApi.scrollTo(pageToSlideIndex(currentPage), true);
    // 初期同期のみ必要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, currentPage, pagesPerSlide]);

  return (
    <div ref={parentRef} className="h-full overflow-hidden px-2 pb-16 pt-3 md:px-4">
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {Array.from({ length: totalSlides }, (_, slideIndex) => {
            const firstPage = slideToFirstPage(slideIndex);
            const secondPage = firstPage + 1 <= totalPages ? firstPage + 1 : null;
            const pages = isSpreadMode
              ? secondPage
                ? [secondPage, firstPage]
                : [firstPage]
              : [firstPage];
            const isNear = pages.some((pageNumber) => Math.abs(pageNumber - currentPage) <= 2);
            const activeSlide = pageToSlideIndex(currentPage) === slideIndex;
            return (
              <div key={firstPage} className="h-full min-w-0 flex-[0_0_100%]">
                <div
                  data-active-scroll={activeSlide ? "true" : "false"}
                  className="mx-auto h-full overflow-auto pb-4"
                >
                  <div className="mx-auto flex w-fit gap-3">
                    {pages.map((pageNumber) => {
                      const ratio = pageRatios[pageNumber] ?? DEFAULT_PAGE_RATIO;
                      return isNear ? (
                        <PageCanvas
                          key={pageNumber}
                          pageNumber={pageNumber}
                          scale={1}
                          className="mx-auto"
                          fixedWidth={pageWidth}
                        />
                      ) : (
                        <div
                          key={pageNumber}
                          className="mx-auto rounded-md border border-dashed bg-muted/40"
                          style={{
                            width: `${Math.floor(pageWidth)}px`,
                            height: `${Math.floor(pageWidth * ratio)}px`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
