// ═══════════════════════════════════════════════════════════════════
// Product Catalogue — renderers (BROWSER ONLY: jsPDF + <canvas>)
// Imported dynamically from the admin client so jsPDF/canvas never hit SSR.
// Pure data + grouping lives in lib/catalogue.ts.
//
// Two variants:
//   • "list"   — a branded text price list (name → price), fast + reliable.
//   • "photos" — a product-photo card grid, for Instagram carousels / flyers.
// Each variant exports as PDF (print) or PNG images (one per category, split
// at 10 items). Design follows flyer/carousel conventions: one consistent
// template, a masthead cover band, generous margins, a 2-col card grid, and a
// graceful placeholder when a photo is missing or can't be loaded cross-origin.
// ═══════════════════════════════════════════════════════════════════

import { BUSINESS_PHONE, CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import { dateStamp } from "@/lib/csv";
import {
    CATALOGUE_BRAND as C,
    catalogueItemCount,
    type CatalogueImagePage,
    type CatalogueSection,
    chunkSectionsForImages,
} from "@/lib/catalogue";

export type CatalogueVariant = "list" | "photos";

const BRAND_LABEL = SITE_NAME.toUpperCase();
const CONTACT_LINE = `${CONTACT_EMAIL}   ·   ${BUSINESS_PHONE}   ·   Lagos`;
const SUBTITLE = "PRODUCT CATALOGUE · PRICE LIST";
const SANS = "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MAX_PER_IMAGE = 10; // price-list images
const PHOTO_W = 1920; // 16:9 landscape slide
const PHOTO_H = 1080; // 1920×1080
const PHOTO_COLS = 4; // single row of large cards across the wide frame
const PHOTO_PER_SLIDE = 4;

function prettyDate(): string {
    return new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function slugify(s: string): string {
    return (
        s
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
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

function spaced(s: string): string {
    return s.split("").join(" ");
}

/**
 * Split each category into slides of at most `maxPerSlide`, but balanced so the
 * last slide is never left with a single lonely card (e.g. 5 → 3+2, not 4+1).
 */
function chunkSectionsBalanced(
    sections: CatalogueSection[],
    maxPerSlide: number,
): CatalogueImagePage[] {
    const pages: CatalogueImagePage[] = [];
    for (const section of sections) {
        const n = section.items.length;
        if (n === 0) continue;
        const slides = Math.ceil(n / maxPerSlide);
        const base = Math.floor(n / slides);
        const rem = n % slides;
        let offset = 0;
        for (let s = 0; s < slides; s++) {
            const size = base + (s < rem ? 1 : 0);
            pages.push({
                category: section.category,
                items: section.items.slice(offset, offset + size),
                part: s + 1,
                totalParts: slides,
            });
            offset += size;
        }
    }
    return pages;
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
    return `${t}…`;
}

/** Wrap text to at most `maxLines`, ellipsising the last line if it overflows. */
function wrapLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxW: number,
    maxLines: number,
): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width <= maxW || !cur) {
            cur = test;
        } else {
            lines.push(cur);
            cur = w;
            if (lines.length === maxLines - 1) break;
        }
    }
    if (lines.length < maxLines && cur) lines.push(cur);
    if (lines.length) lines[lines.length - 1] = truncateToWidth(ctx, lines[lines.length - 1], maxW);
    return lines;
}

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

// ─── Image loading (cross-origin safe) ───────────────────────────

function loadImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = "anonymous"; // required so the canvas stays untainted
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null); // non-CORS / broken → placeholder
        img.src = url;
    });
}

async function preloadImages(sections: CatalogueSection[]): Promise<Map<string, HTMLImageElement>> {
    const urls = new Set<string>();
    for (const s of sections) for (const it of s.items) if (it.image) urls.add(it.image);
    const map = new Map<string, HTMLImageElement>();
    await Promise.all(
        [...urls].map((u) => loadImage(u).then((img) => { if (img) map.set(u, img); })),
    );
    return map;
}

/** Draw an image object-fit:cover into a rounded rect. */
function drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    topOnly = false,
): void {
    ctx.save();
    if (topOnly) roundRectTop(ctx, x, y, w, h, r);
    else roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    const ir = img.width / img.height;
    const tr = w / h;
    let dw: number, dh: number, dx: number, dy: number;
    if (ir > tr) {
        dh = h;
        dw = h * ir;
        dx = x - (dw - w) / 2;
        dy = y;
    } else {
        dw = w;
        dh = w / ir;
        dx = x;
        dy = y - (dh - h) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
}

/** Brand-tinted placeholder with the product initial when no photo is available. */
function drawPlaceholder(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    topOnly = false,
): void {
    ctx.save();
    if (topOnly) roundRectTop(ctx, x, y, w, h, r);
    else roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.fillStyle = C.creamAlt;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(53,94,59,0.28)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(h * 0.34)}px ${SERIF}`;
    ctx.fillText((name.trim()[0] || "•").toUpperCase(), x + w / 2, y + h / 2 + 2);
    ctx.textBaseline = "alphabetic";
    ctx.restore();
}

// ─── Price drawing (softened ₦ so bold digits don't read as strikethrough) ──

type PriceStyle = { size: number; color: string; unitColor: string };

/** Split "₦11,000 / kg" → { naira:"₦", digits:"11,000", unit:"kg" }. */
function splitPrice(label: string): { naira: string; digits: string; unit: string | null } {
    const [money, unit] = label.split(" / ");
    return { naira: money.charAt(0), digits: money.slice(1), unit: unit ?? null };
}

function priceWidth(ctx: CanvasRenderingContext2D, label: string, s: PriceStyle): number {
    const { naira, digits, unit } = splitPrice(label);
    ctx.font = `500 ${s.size * 0.78}px ${SANS}`;
    let w = ctx.measureText(naira).width + 2;
    ctx.font = `bold ${s.size}px ${SANS}`;
    w += ctx.measureText(digits).width;
    if (unit) {
        ctx.font = `500 ${s.size * 0.72}px ${SANS}`;
        w += ctx.measureText(` / ${unit}`).width;
    }
    return w;
}

/** Draw a price starting at left x. Returns the x after drawing. */
function drawPriceLeft(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    s: PriceStyle,
): number {
    const { naira, digits, unit } = splitPrice(label);
    ctx.textAlign = "left";
    ctx.fillStyle = s.color;
    ctx.font = `500 ${s.size * 0.78}px ${SANS}`;
    ctx.fillText(naira, x, y);
    x += ctx.measureText(naira).width + 2;
    ctx.font = `bold ${s.size}px ${SANS}`;
    ctx.fillText(digits, x, y);
    x += ctx.measureText(digits).width;
    if (unit) {
        ctx.font = `500 ${s.size * 0.72}px ${SANS}`;
        ctx.fillStyle = s.unitColor;
        ctx.fillText(` / ${unit}`, x, y);
        x += ctx.measureText(` / ${unit}`).width;
    }
    return x;
}

/** Draw a price right-aligned to rightX. */
function drawPriceRight(
    ctx: CanvasRenderingContext2D,
    rightX: number,
    y: number,
    label: string,
    s: PriceStyle,
): void {
    drawPriceLeft(ctx, rightX - priceWidth(ctx, label, s), y, label, s);
}

// ─── Shared canvas chrome ────────────────────────────────────────

const W = 1080;
const SCALE = 2;
const PAD = 56;
const HEADER_H = 156;
const CAT_H = 72;
const FOOTER_H = 92;

function newCanvas(
    width: number,
    height: number,
    bg: string = C.cream,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement("canvas");
    canvas.width = width * SCALE;
    canvas.height = height * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    return { canvas, ctx };
}

/** Rounded only on the top two corners (bottom flush). */
function roundRectTop(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
): void {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
}

/** Masthead (red) + category band (green). Returns the y where body content starts. */
function drawHead(ctx: CanvasRenderingContext2D, page: CatalogueImagePage, width: number = W): number {
    // Masthead
    ctx.fillStyle = C.red;
    ctx.fillRect(0, 0, width, HEADER_H);
    ctx.fillStyle = C.cream;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `bold 56px ${SERIF}`;
    ctx.fillText(BRAND_LABEL, PAD, 86);
    ctx.font = `600 20px ${SANS}`;
    ctx.fillText(spaced(SUBTITLE), PAD, 122);
    ctx.textAlign = "right";
    ctx.font = `20px ${SANS}`;
    ctx.fillText(prettyDate(), width - PAD, 86);

    // Category band
    const catY = HEADER_H;
    ctx.fillStyle = C.green;
    ctx.fillRect(0, catY, width, CAT_H);
    const baseline = catY + CAT_H / 2 + 11;
    ctx.fillStyle = C.cream;
    ctx.textAlign = "left";
    ctx.font = `bold 34px ${SERIF}`;
    const title =
        page.totalParts > 1 ? `${page.category}  (${page.part}/${page.totalParts})` : page.category;
    ctx.fillText(title, PAD, baseline);
    ctx.textAlign = "right";
    ctx.font = `20px ${SANS}`;
    ctx.fillText(`${page.items.length} item${page.items.length === 1 ? "" : "s"}`, width - PAD, baseline);

    return catY + CAT_H;
}

function drawFooter(ctx: CanvasRenderingContext2D, height: number, width: number = W): void {
    const y = height - FOOTER_H;
    ctx.fillStyle = C.green;
    ctx.fillRect(0, y, width, FOOTER_H);
    ctx.fillStyle = C.cream;
    ctx.textAlign = "center";
    ctx.font = `bold 22px ${SANS}`;
    ctx.fillText("Order now · Same-day delivery across Lagos", width / 2, y + 38);
    ctx.font = `18px ${SANS}`;
    ctx.fillText(CONTACT_LINE, width / 2, y + 68);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    });
}

// ─── PNG: list variant ───────────────────────────────────────────

const LIST_ROW_H = 64;

function renderListImage(page: CatalogueImagePage): Promise<Blob> {
    const bodyTop = HEADER_H + CAT_H + 10;
    const height = bodyTop + page.items.length * LIST_ROW_H + 22 + FOOTER_H;
    const { canvas, ctx } = newCanvas(W, height);
    drawHead(ctx, page);

    const priceStyle: PriceStyle = { size: 30, color: C.red, unitColor: C.red };
    page.items.forEach((item, idx) => {
        const y = bodyTop + idx * LIST_ROW_H;
        if (idx % 2 === 1) {
            ctx.fillStyle = C.creamAlt;
            ctx.fillRect(PAD - 16, y, W - (PAD - 16) * 2, LIST_ROW_H);
        }
        const midY = y + LIST_ROW_H / 2 + 10;
        ctx.fillStyle = C.espresso;
        ctx.textAlign = "left";
        ctx.font = `30px ${SANS}`;
        ctx.fillText(truncateToWidth(ctx, item.name, W - PAD * 2 - 280), PAD, midY);
        drawPriceRight(ctx, W - PAD, midY, item.priceLabel, priceStyle);
    });

    drawFooter(ctx, height);
    return canvasToBlob(canvas);
}

// ─── PNG: photo-card carousel (16:9 / 1920×1080) ─────────────────

const CARD_GAP = 26;
const CARD_BODY_H = 128;
const CARD_RADIUS = 22;
const CARD_PAGE_BG = "#F2E8D8"; // deeper parchment so white cards pop

/** One card. */
function drawPhotoCard(
    ctx: CanvasRenderingContext2D,
    item: CatalogueImagePage["items"][number],
    images: Map<string, HTMLImageElement>,
    x: number,
    y: number,
    w: number,
    cardH: number,
    photoH: number,
): void {
    // Surface: soft shadow + fill
    ctx.save();
    ctx.shadowColor = "rgba(44,26,14,0.14)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, x, y, w, cardH, CARD_RADIUS);
    ctx.fill();
    ctx.restore();
    // Hairline border
    ctx.strokeStyle = "rgba(44,26,14,0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, w - 1, cardH - 1, CARD_RADIUS);
    ctx.stroke();

    // Photo (top corners only, flush into body)
    const img = item.image ? images.get(item.image) : undefined;
    if (img) drawImageCover(ctx, img, x, y, w, photoH, CARD_RADIUS, true);
    else drawPlaceholder(ctx, item.name, x, y, w, photoH, CARD_RADIUS, true);

    // Name (≤2 lines under the photo)
    const bx = x + 26;
    ctx.fillStyle = C.espresso;
    ctx.textAlign = "left";
    ctx.font = `600 28px ${SANS}`;
    const nameLines = wrapLines(ctx, item.name, w - 52, 2);
    nameLines.forEach((ln, i) => ctx.fillText(ln, bx, y + photoH + 46 + i * 33));

    // Divider + price anchored to card bottom
    const dividerY = y + cardH - 60;
    ctx.strokeStyle = "rgba(44,26,14,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, dividerY);
    ctx.lineTo(x + w - 26, dividerY);
    ctx.stroke();
    const priceStyle: PriceStyle = { size: 34, color: C.red, unitColor: "rgba(181,51,46,0.55)" };
    drawPriceLeft(ctx, bx, y + cardH - 24, item.priceLabel, priceStyle);
}

/** A category slide (16:9): masthead + category bar + single row of large cards + CTA. */
function renderPhotoImage(
    page: CatalogueImagePage,
    images: Map<string, HTMLImageElement>,
): Promise<Blob> {
    const { canvas, ctx } = newCanvas(PHOTO_W, PHOTO_H, CARD_PAGE_BG);
    const bodyTop = drawHead(ctx, page, PHOTO_W) + 4;
    const bodyBottom = PHOTO_H - FOOTER_H;

    const total = page.items.length;
    const rows = Math.ceil(total / PHOTO_COLS);
    const contentW = PHOTO_W - PAD * 2;
    const colW = (contentW - CARD_GAP * (PHOTO_COLS - 1)) / PHOTO_COLS;

    // Fit rows into the body; cap card height so a single row isn't oversized.
    const avail = bodyBottom - bodyTop - 28;
    const cardH = Math.min(
        Math.floor((avail - (rows - 1) * CARD_GAP) / rows),
        Math.round(colW * 0.82) + CARD_BODY_H,
    );
    const photoH = cardH - CARD_BODY_H;
    const gridH = rows * cardH + (rows - 1) * CARD_GAP;
    const gridTop = bodyTop + (bodyBottom - bodyTop - gridH) / 2; // vertically centre

    page.items.forEach((item, idx) => {
        const row = Math.floor(idx / PHOTO_COLS);
        const col = idx % PHOTO_COLS;
        const itemsInRow = Math.min(PHOTO_COLS, total - row * PHOTO_COLS);
        const rowW = itemsInRow * colW + (itemsInRow - 1) * CARD_GAP;
        const startX = PAD + (contentW - rowW) / 2; // centre short rows
        const x = startX + col * (colW + CARD_GAP);
        const y = gridTop + row * (cardH + CARD_GAP);
        drawPhotoCard(ctx, item, images, x, y, colW, cardH, photoH);
    });

    drawFooter(ctx, PHOTO_H, PHOTO_W);
    return canvasToBlob(canvas);
}

/** Slide 1 — the carousel hook / cover (16:9). */
function renderCoverSlide(sections: CatalogueSection[]): Promise<Blob> {
    const { canvas, ctx } = newCanvas(PHOTO_W, PHOTO_H, C.red);

    // Thin brand accents top/bottom (full width)
    ctx.fillStyle = C.green;
    ctx.fillRect(0, 0, PHOTO_W, 14);
    ctx.fillRect(0, PHOTO_H - 14, PHOTO_W, 14);

    const cx = PHOTO_W / 2;
    ctx.textAlign = "center";

    ctx.fillStyle = "rgba(253,246,236,0.85)";
    ctx.font = `600 30px ${SANS}`;
    ctx.fillText(spaced("FRESH · CHILLED · FROZEN"), cx, 300);

    ctx.fillStyle = C.cream;
    ctx.font = `bold 150px ${SERIF}`;
    ctx.fillText(BRAND_LABEL, cx, 470);

    ctx.font = `400 38px ${SANS}`;
    ctx.fillText(SITE_DESCRIPTION, cx, 540);

    // Divider rule
    ctx.strokeStyle = "rgba(253,246,236,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 150, 610);
    ctx.lineTo(cx + 150, 610);
    ctx.stroke();

    ctx.fillStyle = C.cream;
    ctx.font = `bold 64px ${SERIF}`;
    ctx.fillText("Product Catalogue", cx, 710);

    const productCount = catalogueItemCount(sections);
    ctx.fillStyle = "rgba(253,246,236,0.85)";
    ctx.font = `500 32px ${SANS}`;
    ctx.fillText(
        `${productCount} products · ${sections.length} categories · ${prettyDate()}`,
        cx,
        765,
    );

    ctx.fillStyle = C.cream;
    ctx.font = `600 32px ${SANS}`;
    ctx.fillText("Swipe to browse  →", cx, 855);

    // Contact
    ctx.fillStyle = "rgba(253,246,236,0.85)";
    ctx.font = `27px ${SANS}`;
    ctx.fillText(CONTACT_LINE, cx, PHOTO_H - 95);
    ctx.font = `23px ${SANS}`;
    ctx.fillText("Same-day delivery across Lagos", cx, PHOTO_H - 58);

    return canvasToBlob(canvas);
}

// ─── PNG entry point ─────────────────────────────────────────────

export async function generateCataloguePngs(
    sections: CatalogueSection[],
    variant: CatalogueVariant = "list",
): Promise<number> {
    if (variant === "photos") {
        const images = await preloadImages(sections);
        const pages = chunkSectionsBalanced(sections, PHOTO_PER_SLIDE);
        const stamp = dateStamp();
        // Cover slide first (the carousel hook), then category slides.
        const cover = await renderCoverSlide(sections);
        downloadBlob(cover, `${slugify(SITE_NAME)}-catalogue-00-cover-${stamp}.png`);
        for (let i = 0; i < pages.length; i++) {
            await new Promise((r) => setTimeout(r, 220));
            const page = pages[i];
            const blob = await renderPhotoImage(page, images);
            const partSuffix = page.totalParts > 1 ? `-${page.part}` : "";
            const n = String(i + 1).padStart(2, "0");
            downloadBlob(
                blob,
                `${slugify(SITE_NAME)}-catalogue-${n}-${slugify(page.category)}${partSuffix}-${stamp}.png`,
            );
        }
        return pages.length + 1;
    }

    const pages = chunkSectionsForImages(sections, MAX_PER_IMAGE);
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const blob = await renderListImage(page);
        const partSuffix = page.totalParts > 1 ? `-${page.part}` : "";
        downloadBlob(
            blob,
            `${slugify(SITE_NAME)}-catalogue-prices-${slugify(page.category)}${partSuffix}-${dateStamp()}.png`,
        );
        if (i < pages.length - 1) await new Promise((r) => setTimeout(r, 220));
    }
    return pages.length;
}

// ─── PDF ─────────────────────────────────────────────────────────

function imgToJpeg(img: HTMLImageElement, maxDim = 640): { data: string; w: number; h: number } | null {
    const ir = img.width / img.height;
    let w = img.width;
    let h = img.height;
    if (Math.max(w, h) > maxDim) {
        if (ir >= 1) {
            w = maxDim;
            h = maxDim / ir;
        } else {
            h = maxDim;
            w = maxDim * ir;
        }
    }
    const c = document.createElement("canvas");
    c.width = Math.round(w);
    c.height = Math.round(h);
    const cx = c.getContext("2d");
    if (!cx) return null;
    cx.drawImage(img, 0, 0, c.width, c.height);
    try {
        return { data: c.toDataURL("image/jpeg", 0.82), w: c.width, h: c.height };
    } catch {
        return null; // tainted (shouldn't happen with crossOrigin)
    }
}

async function makePdf() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const bannerH = 74;
    const dateStr = prettyDate();

    const chrome = (pageNumber: number) => {
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
        doc.setDrawColor(...hexToRgb(C.creamAlt));
        doc.setLineWidth(0.5);
        doc.line(margin, pageH - 34, pageW - margin, pageH - 34);
        doc.setTextColor(...hexToRgb(C.espresso));
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(CONTACT_LINE, pageW / 2, pageH - 20, { align: "center" });
        doc.text(`Page ${pageNumber}`, pageW - margin, pageH - 20, { align: "right" });
    };

    return { doc, pageW, pageH, margin, bannerH, chrome };
}

async function generateListPdf(sections: CatalogueSection[]): Promise<void> {
    const { default: autoTable } = await import("jspdf-autotable");
    const { doc, margin, bannerH, chrome } = await makePdf();

    let startY = bannerH + 22;
    doc.setTextColor(...hexToRgb(C.espresso));
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("All prices in Naira (₦). Prices are subject to change and availability.", margin, startY);
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
            },
            bodyStyles: {
                textColor: hexToRgb(C.espresso),
                fontSize: 11,
                cellPadding: { top: 6, bottom: 6, left: 10, right: 10 },
            },
            alternateRowStyles: { fillColor: hexToRgb(C.creamAlt) },
            columnStyles: {
                0: { cellWidth: "auto" },
                1: { halign: "right", cellWidth: 130, fontStyle: "bold", textColor: hexToRgb(C.red) },
            },
            didParseCell: (data) => {
                if (data.section === "head" && data.column.index === 1) data.cell.styles.halign = "right";
            },
            didDrawPage: (data) => chrome(data.pageNumber),
        });
        // @ts-expect-error lastAutoTable is attached by the plugin at runtime
        startY = doc.lastAutoTable.finalY + 22;
    }

    doc.save(`${slugify(SITE_NAME)}-catalogue-prices-${dateStamp()}.pdf`);
}

async function generatePhotoPdf(sections: CatalogueSection[]): Promise<void> {
    const images = await preloadImages(sections);
    const { doc, pageW, pageH, margin, bannerH, chrome } = await makePdf();

    const cols = 2;
    const gap = 18;
    const colW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
    const photoH = colW * 0.72;
    const bodyH = 44;
    const cardH = photoH + bodyH;
    const rowGap = 18;
    const top = bannerH + 34;
    const bottom = pageH - 44;

    let first = true;
    let y = top;
    let col = 0;

    const newPage = () => {
        doc.addPage();
        y = top;
        col = 0;
    };

    for (const section of sections) {
        // Category header bar (green)
        if (!first && y + 40 > bottom) newPage();
        if (col !== 0) {
            col = 0;
            y += cardH + rowGap;
            if (y + cardH > bottom) newPage();
        }
        doc.setFillColor(...hexToRgb(C.green));
        doc.rect(margin, y, pageW - margin * 2, 26, "F");
        doc.setTextColor(...hexToRgb(C.cream));
        doc.setFont("times", "bold");
        doc.setFontSize(13);
        doc.text(section.category.toUpperCase(), margin + 8, y + 18);
        y += 26 + 14;
        first = false;

        for (const item of section.items) {
            if (y + cardH > bottom) {
                newPage();
            }
            const x = margin + col * (colW + gap);

            // Card border
            doc.setDrawColor(...hexToRgb(C.creamAlt));
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, y, colW, cardH, 6, 6, "FD");

            const img = item.image ? images.get(item.image) : undefined;
            const jpeg = img ? imgToJpeg(img) : null;
            if (jpeg) {
                // jsPDF can't source-crop, so contain-fit the photo on a tinted box.
                doc.setFillColor(...hexToRgb(C.creamAlt));
                doc.rect(x, y, colW, photoH, "F");
                const fit = Math.min(colW / jpeg.w, photoH / jpeg.h);
                const dw = jpeg.w * fit;
                const dh = jpeg.h * fit;
                doc.addImage(jpeg.data, "JPEG", x + (colW - dw) / 2, y + (photoH - dh) / 2, dw, dh);
            } else {
                doc.setFillColor(...hexToRgb(C.creamAlt));
                doc.rect(x, y, colW, photoH, "F");
                doc.setTextColor(53, 94, 59);
                doc.setFont("times", "bold");
                doc.setFontSize(28);
                doc.text((item.name.trim()[0] || "•").toUpperCase(), x + colW / 2, y + photoH / 2 + 8, {
                    align: "center",
                });
            }

            // Name + price
            doc.setTextColor(...hexToRgb(C.espresso));
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            const name = doc.splitTextToSize(item.name, colW - 16)[0];
            doc.text(name, x + 8, y + photoH + 17);
            doc.setTextColor(...hexToRgb(C.red));
            doc.setFontSize(10.5);
            doc.text(item.priceLabel, x + 8, y + photoH + 34);

            col += 1;
            if (col >= cols) {
                col = 0;
                y += cardH + rowGap;
            }
        }
    }

    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        chrome(p);
    }
    doc.save(`${slugify(SITE_NAME)}-catalogue-photos-${dateStamp()}.pdf`);
}

export async function generateCataloguePdf(
    sections: CatalogueSection[],
    variant: CatalogueVariant = "list",
): Promise<void> {
    if (variant === "photos") return generatePhotoPdf(sections);
    return generateListPdf(sections);
}
