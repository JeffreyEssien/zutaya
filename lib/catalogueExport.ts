// ═══════════════════════════════════════════════════════════════════
// Product Catalogue — renderers (BROWSER ONLY: jsPDF + <canvas>)
// Imported dynamically from the admin client so jsPDF/canvas never hit SSR.
// Pure data + grouping lives in lib/catalogue.ts.
// ═══════════════════════════════════════════════════════════════════

import { BUSINESS_PHONE, CONTACT_EMAIL, SITE_NAME } from "@/lib/constants";
import { dateStamp } from "@/lib/csv";
import {
    CATALOGUE_BRAND as C,
    type CatalogueImagePage,
    type CatalogueSection,
    chunkSectionsForImages,
} from "@/lib/catalogue";

const BRAND_LABEL = SITE_NAME.toUpperCase();
const CONTACT_LINE = `${CONTACT_EMAIL}   ·   ${BUSINESS_PHONE}   ·   Lagos`;
const SUBTITLE = "PRODUCT CATALOGUE · PRICE LIST";

function prettyDate(): string {
    return new Date().toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ];
}

function slugify(s: string): string {
    return (
        s
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "") // strip accents: "Zúta Ya" → "Zuta Ya"
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "section"
    );
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── PDF ─────────────────────────────────────────────────────────

/** Generate a branded multi-page A4 price-list PDF and download it. */
export async function generateCataloguePdf(sections: CatalogueSection[]): Promise<void> {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const bannerH = 74;
    const dateStr = prettyDate();

    const drawChrome = (pageNumber: number) => {
        // Top banner (brand red)
        doc.setFillColor(...hexToRgb(C.red));
        doc.rect(0, 0, pageW, bannerH, "F");
        doc.setTextColor(...hexToRgb(C.cream));
        doc.setFont("times", "bold");
        doc.setFontSize(24);
        doc.text(BRAND_LABEL, margin, 34);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(SUBTITLE, margin, 52);
        doc.setFontSize(8);
        doc.text(dateStr, pageW - margin, 34, { align: "right" });

        // Footer
        doc.setDrawColor(...hexToRgb(C.creamAlt));
        doc.setLineWidth(0.5);
        doc.line(margin, pageH - 34, pageW - margin, pageH - 34);
        doc.setTextColor(...hexToRgb(C.espresso));
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(CONTACT_LINE, pageW / 2, pageH - 20, { align: "center" });
        doc.text(`Page ${pageNumber}`, pageW - margin, pageH - 20, { align: "right" });
    };

    // Strap line under the first banner
    let startY = bannerH + 22;
    doc.setTextColor(...hexToRgb(C.espresso));
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(
        "All prices in Naira (₦). Prices are subject to change and availability.",
        margin,
        startY,
    );
    startY += 14;

    for (const section of sections) {
        autoTable(doc, {
            startY,
            margin: { top: bannerH + 16, left: margin, right: margin, bottom: 44 },
            head: [[section.category.toUpperCase(), "PRICE"]],
            body: section.items.map((i) => [i.name, i.priceLabel]),
            theme: "striped",
            headStyles: {
                fillColor: hexToRgb(C.green),
                textColor: hexToRgb(C.cream),
                fontStyle: "bold",
                fontSize: 11,
                cellPadding: { top: 7, bottom: 7, left: 10, right: 10 },
                halign: "left",
            },
            bodyStyles: {
                textColor: hexToRgb(C.espresso),
                fontSize: 11,
                cellPadding: { top: 6, bottom: 6, left: 10, right: 10 },
            },
            alternateRowStyles: { fillColor: hexToRgb(C.creamAlt) },
            columnStyles: {
                0: { cellWidth: "auto" },
                1: {
                    halign: "right",
                    cellWidth: 130,
                    fontStyle: "bold",
                    textColor: hexToRgb(C.red),
                },
            },
            didParseCell: (data) => {
                if (data.section === "head" && data.column.index === 1) {
                    data.cell.styles.halign = "right";
                }
            },
            didDrawPage: (data) => drawChrome(data.pageNumber),
        });
        // @ts-expect-error lastAutoTable is attached by the plugin at runtime
        startY = doc.lastAutoTable.finalY + 22;
    }

    doc.save(`${slugify(SITE_NAME)}-catalogue-${dateStamp()}.pdf`);
}

// ─── PNG (one image per category, split when long) ───────────────

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

const IMG = {
    width: 1080,
    pad: 56,
    headerH: 188,
    catBandH: 76,
    rowH: 66,
    footerH: 92,
    scale: 2, // retina
} as const;

function renderImagePage(page: CatalogueImagePage): Promise<Blob> {
    const bodyTop = IMG.headerH + IMG.catBandH + 10;
    const height = bodyTop + page.items.length * IMG.rowH + 24 + IMG.footerH;

    const canvas = document.createElement("canvas");
    canvas.width = IMG.width * IMG.scale;
    canvas.height = height * IMG.scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.scale(IMG.scale, IMG.scale);

    // Background
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, 0, IMG.width, height);

    // Header band (brand red)
    ctx.fillStyle = C.red;
    ctx.fillRect(0, 0, IMG.width, IMG.headerH);
    ctx.fillStyle = C.cream;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = "bold 62px Georgia, 'Times New Roman', serif";
    ctx.fillText(BRAND_LABEL, IMG.pad, 96);
    ctx.font = "600 22px system-ui, -apple-system, Arial, sans-serif";
    ctx.fillText(spaced(SUBTITLE), IMG.pad, 138);
    ctx.font = "20px system-ui, -apple-system, Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(prettyDate(), IMG.width - IMG.pad, 96);

    // Category band (brand green)
    const catY = IMG.headerH;
    ctx.fillStyle = C.green;
    ctx.fillRect(0, catY, IMG.width, IMG.catBandH);
    ctx.fillStyle = C.cream;
    ctx.textAlign = "left";
    ctx.font = "bold 34px Georgia, 'Times New Roman', serif";
    const title =
        page.totalParts > 1
            ? `${page.category}  (${page.part}/${page.totalParts})`
            : page.category;
    ctx.fillText(title, IMG.pad, catY + 50);
    ctx.textAlign = "right";
    ctx.font = "20px system-ui, -apple-system, Arial, sans-serif";
    const count = `${page.items.length} item${page.items.length === 1 ? "" : "s"}`;
    ctx.fillText(count, IMG.width - IMG.pad, catY + 49);

    // Rows
    page.items.forEach((item, idx) => {
        const y = bodyTop + idx * IMG.rowH;
        if (idx % 2 === 1) {
            ctx.fillStyle = C.creamAlt;
            ctx.fillRect(IMG.pad - 16, y, IMG.width - (IMG.pad - 16) * 2, IMG.rowH);
        }
        const midY = y + IMG.rowH / 2 + 10;
        ctx.fillStyle = C.espresso;
        ctx.textAlign = "left";
        ctx.font = "30px system-ui, -apple-system, Arial, sans-serif";
        ctx.fillText(truncateToWidth(ctx, item.name, IMG.width - IMG.pad * 2 - 240), IMG.pad, midY);
        ctx.fillStyle = C.red;
        ctx.textAlign = "right";
        ctx.font = "bold 30px system-ui, -apple-system, Arial, sans-serif";
        ctx.fillText(item.priceLabel, IMG.width - IMG.pad, midY);
    });

    // Footer band (brand green)
    const footY = height - IMG.footerH;
    ctx.fillStyle = C.green;
    ctx.fillRect(0, footY, IMG.width, IMG.footerH);
    ctx.fillStyle = C.cream;
    ctx.textAlign = "center";
    ctx.font = "22px system-ui, -apple-system, Arial, sans-serif";
    ctx.fillText(CONTACT_LINE, IMG.width / 2, footY + 40);
    ctx.font = "16px system-ui, -apple-system, Arial, sans-serif";
    ctx.fillText("All prices in Naira (₦) · subject to change", IMG.width / 2, footY + 68);

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
            "image/png",
        );
    });
}

function spaced(s: string): string {
    return s.split("").join(" ");
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
    return `${t}…`;
}

/**
 * Generate one branded PNG per category (long categories split across images)
 * and download each. Returns the number of images produced.
 */
export async function generateCataloguePngs(
    sections: CatalogueSection[],
    maxItemsPerImage = 16,
): Promise<number> {
    const pages = chunkSectionsForImages(sections, maxItemsPerImage);
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const blob = await renderImagePage(page);
        const partSuffix = page.totalParts > 1 ? `-${page.part}` : "";
        downloadBlob(
            blob,
            `${slugify(SITE_NAME)}-catalogue-${slugify(page.category)}${partSuffix}-${dateStamp()}.png`,
        );
        // Space out downloads so browsers don't block the batch.
        if (i < pages.length - 1) await new Promise((r) => setTimeout(r, 200));
    }
    return pages.length;
}
