import { useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";

import { PageCanvas } from "../pdf/PageCanvas";
import { usePdf } from "../pdf/PdfProvider";
import { useViewerStore } from "./viewerStore";

export function HorizontalViewer() {
  const { numPages } = usePdf();
  const currentPage = useViewerStore((state) => state.currentPage);
  const setCurrentPage = useViewerStore((state) => state.setCurrentPage);
  const setGoToPageImpl = useViewerStore((state) => state.setGoToPageImpl);

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
    if (!emblaApi) {
      return;
    }
    emblaApi.scrollTo(currentPage - 1, true);
    // 初期同期のみ必要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi]);

  return (
    <div className="h-full overflow-hidden px-2 pb-16 pt-3 md:px-4">
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {Array.from({ length: Math.max(1, numPages) }, (_, index) => {
            const pageNumber = index + 1;
            const isNear = Math.abs(pageNumber - currentPage) <= 2;
            return (
              <div key={pageNumber} className="h-full min-w-0 flex-[0_0_100%]">
                <div className="mx-auto h-full max-w-5xl overflow-auto pb-4">
                  {isNear ? (
                    <PageCanvas pageNumber={pageNumber} scale={1} className="w-full" />
                  ) : (
                    <div className="h-[1200px] w-full rounded-md border border-dashed bg-muted/40" />
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
