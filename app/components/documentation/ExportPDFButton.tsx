"use client";

import { useState } from "react";
import { BiDownload } from "react-icons/bi";
import { Button } from "@/app/components/ui/Button";

interface ExportPDFButtonProps {
  projectTitle: string;
  contentAreaId: string;
  paperSize: "A4" | "LEGAL" | "LONG";
}

// ─── Convert any CSS color value the browser understands → safe rgb() ────────
// We piggyback on the browser's own oklch→sRGB conversion via a 1×1 canvas.
function colorToRgb(value: string): string {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return a === 0 ? "transparent" : `rgb(${r},${g},${b})`;
  } catch {
    return "transparent";
  }
}

// ─── Regex that matches any modern color function html2canvas v1 can't parse ──
const UNSAFE_COLOR = /oklch|oklab|lab\(|lch\(/;

// ─── Replace all unsafe color functions inside an arbitrary CSS string ────────
// Handles: background-image: linear-gradient(to right, oklch(...), oklch(...))
function sanitizeCssValue(value: string): string {
  if (!UNSAFE_COLOR.test(value)) return value;

  // Match oklch(...) / oklab(...) / lab(...) / lch(...) with balanced parens
  return value.replace(/(oklch|oklab|lab|lch)\(([^)]*)\)/g, (match) => {
    const rgb = colorToRgb(match);
    return rgb === "transparent" ? "rgba(0,0,0,0)" : rgb;
  });
}

export function ExportPDFButton({ projectTitle, contentAreaId, paperSize }: ExportPDFButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    // Declared outside try so finally can always restore it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origGCS = (window as any).getComputedStyle as typeof window.getComputedStyle;
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const container = document.getElementById(contentAreaId);
      if (!container) throw new Error("Document container not found");

      const pages = container.querySelectorAll<HTMLElement>(".doc-page");
      if (!pages.length) throw new Error("No pages found to export");

      // ── Monkey-patch window.getComputedStyle ────────────────────────────────
      // html2canvas reads computed styles directly. We intercept every CSS property
      // value and convert oklch/lab/lch values to safe rgb() before they reach
      // html2canvas's parser.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).getComputedStyle = function (
        el: Element,
        pseudo?: string | null
      ): CSSStyleDeclaration {
        const cs = origGCS(el, pseudo);
        return new Proxy(cs, {
          get(target, prop: string | symbol) {
            const raw = (target as unknown as Record<string | symbol, unknown>)[prop];
            if (typeof raw === "function") return raw.bind(target);
            if (typeof raw !== "string") return raw;
            if (!UNSAFE_COLOR.test(raw)) return raw;
            return sanitizeCssValue(raw);
          },
        });
      };

      // ── PDF width in pt based on paper size ──────────────────────────────
      // A4 = 8.27" = 595.28 pt | Legal/Long = 8.5" = 612 pt
      const PT_WIDTH: Record<string, number> = { A4: 595.28, LEGAL: 612, LONG: 612 };
      const pdfWidth = PT_WIDTH[paperSize] ?? 595.28;

      const FOOTER_ZONE = 28; // pt reserved at the bottom of every page

      const drawFooter = (
        pdf: InstanceType<typeof jsPDF>,
        left: string,
        right: string,
        contentH: number
      ) => {
        const lineY = contentH + 4;
        const textY = contentH + FOOTER_ZONE - 9;
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.4);
        pdf.line(36, lineY, pdfWidth - 36, lineY);
        pdf.setFontSize(7.5);
        pdf.setTextColor(160, 160, 160);
        if (left)  pdf.text(left,  36,             textY);
        if (right) pdf.text(right, pdfWidth - 36, textY, { align: "right" });
      };

      // ── Capture all doc-pages first ────────────────────────────────────────
      type Capture = { canvas: HTMLCanvasElement; footerLeft: string; footerRight: string };
      const captures: Capture[] = [];

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const footerEl    = page.querySelector<HTMLElement>("[data-pdf-footer]");
        const footerLeft  = footerEl?.getAttribute("data-footer-left")  ?? "";
        const footerRight = footerEl?.getAttribute("data-footer-right") ?? "";

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll<HTMLElement>("[data-pdf-footer]").forEach((el) => {
              el.style.display = "none";
            });
          },
        });

        captures.push({ canvas, footerLeft, footerRight });
      }

      // ── Build PDF — one page per doc-page, height = actual rendered height ─
      // This ensures content is never sliced awkwardly; long pages get tall PDF pages.
      const firstImgH = (captures[0].canvas.height / captures[0].canvas.width) * pdfWidth;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [pdfWidth, firstImgH + FOOTER_ZONE],
      });

      for (let i = 0; i < captures.length; i++) {
        const { canvas, footerLeft, footerRight } = captures[i];

        // Scale canvas width → PDF width, preserve aspect ratio for height
        const imgH = (canvas.height / canvas.width) * pdfWidth;
        const pageH = imgH + FOOTER_ZONE;

        // Add a new page for every capture after the first
        if (i > 0) pdf.addPage([pdfWidth, pageH]);

        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfWidth, imgH);
        drawFooter(pdf, footerLeft, footerRight, imgH);
      }

      pdf.save(`${projectTitle.replace(/\s+/g, "_")}_documentation.pdf`);
    } catch (err) {
      console.error("[PDF export]", err);
      alert("PDF export failed. Please try again.");
    } finally {
      // Always restore getComputedStyle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).getComputedStyle = origGCS;
      setExporting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={exporting}
      onClick={handleExport}
      className="gap-1.5"
    >
      <BiDownload className="text-base" />
      {exporting ? "Exporting…" : "Export PDF"}
    </Button>
  );
}
