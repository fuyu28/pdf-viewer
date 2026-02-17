import { useEffect, useRef, useState } from "react";
import { type PDFPageProxy } from "pdfjs-dist";

import { usePdf } from "./PdfProvider";

type PageCanvasProps = {
  pageNumber: number;
  scale?: number;
  className?: string;
  fixedWidth?: number;
};

export function PageCanvas({ pageNumber, scale = 1, className, fixedWidth }: PageCanvasProps) {
  const { getPage } = usePdf();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<ReturnType<PDFPageProxy["render"]> | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      if (fixedWidth === undefined) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [fixedWidth]);

  useEffect(() => {
    let canceled = false;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      renderTaskRef.current?.cancel();
      const renderWidth = fixedWidth ?? containerWidth;
      if (renderWidth <= 0) {
        return;
      }

      const page = await getPage(pageNumber);
      if (canceled) {
        return;
      }

      const viewportAtScaleOne = page.getViewport({ scale: 1 });
      const fitWidthScale =
        renderWidth > 0 ? Math.max((renderWidth - 8) / viewportAtScaleOne.width, 0.1) : 1;
      const viewport = page.getViewport({ scale: fitWidthScale * scale });

      const ratio = window.devicePixelRatio || 1;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        return;
      }

      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const renderTask = page.render({
        canvasContext: context,
        canvas,
        viewport,
      });
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
      } catch (error) {
        if (!isRenderCancelError(error)) {
          throw error;
        }
      }
    }

    void renderPage().catch((error: unknown) => {
      if (isRenderCancelError(error)) {
        return;
      }
      console.error(error);
    });

    return () => {
      canceled = true;
      renderTaskRef.current?.cancel();
    };
  }, [containerWidth, fixedWidth, getPage, pageNumber, scale]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={fixedWidth ? { width: `${Math.floor(fixedWidth)}px` } : undefined}
    >
      <canvas ref={canvasRef} className="mx-auto rounded-md bg-white shadow-sm" />
    </div>
  );
}
const isRenderCancelError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  error.name === "RenderingCancelledException";
