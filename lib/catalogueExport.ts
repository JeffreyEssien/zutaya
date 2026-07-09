// ═══════════════════════════════════════════════════════════════════
// Product Catalogue — renderers (BROWSER ONLY: jsPDF + <canvas>)
// Imported dynamically from the admin client so jsPDF/canvas never hit SSR.
// Pure data + grouping lives in lib/catalogue.ts.
//
// Two variants:
//   • "list"   — a branded text price list (name → price), fast + reliable.
//   • "photos" — a product-photo card grid, for social carousels / flyers.
// Each variant exports as PDF (print) or PNG slides (9:16 portrait, one per
// category). The photo carousel uses an editorial template — a red cover title
// card, then category slides with a centred grid of up to 6 cards (2×3) whose
// typography scales with the card width — plus a graceful placeholder when a
// photo is missing or can't be loaded cross-origin.
// ═══════════════════════════════════════════════════════════════════

import { BUSINESS_PHONE, SITE_NAME } from "@/lib/constants";
import { dateStamp } from "@/lib/csv";
import {
    CATALOGUE_BRAND as C,
    type CatalogueImagePage,
    type CatalogueSection,
} from "@/lib/catalogue";

export type CatalogueVariant = "list" | "photos";

const BRAND_LABEL = SITE_NAME.toUpperCase();
/** Brand slogan (from the logo) — sits under the wordmark. */
const TAGLINE = "We run errands for your convenience";
/** Public web address — featured on every slide/footer. */
const SITE_WEB = "www.zutayang.com";
const CONTACT_LINE = `${SITE_WEB}   ·   ${BUSINESS_PHONE}   ·   Lagos`;
const SUBTITLE = "PRODUCT CATALOGUE · PRICE LIST";
const SANS = "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const PHOTO_W = 1080; // 9:16 portrait slide (full phone screen)
const PHOTO_H = 1920; // 1080×1920
const PHOTO_COLS = 2; // 2 cards per row suits the narrower portrait frame
const PHOTO_PER_SLIDE = 6; // 3 rows × 2 — fits more per slide while staying large

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
const HEADER_H = 140; // brand wordmark zone
const CAT_H = 110; // category title zone
const FOOTER_H = 104;
const INK = "44,26,14"; // espresso, for translucent ink fills

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

/**
 * Editorial masthead: a small letter-spaced wordmark, then the category as a
 * large centred serif with a short brand-red accent rule beneath it. No heavy
 * colour blocks — the warm page shows through so it reads as designed, not
 * generated. Returns the y where body content starts.
 */
function drawHead(ctx: CanvasRenderingContext2D, page: CatalogueImagePage, width: number = W): number {
    const cx = width / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Brand wordmark + slogan
    ctx.fillStyle = C.red;
    ctx.font = `600 24px ${SANS}`;
    ctx.fillText(spaced(BRAND_LABEL), cx, 58);
    ctx.fillStyle = `rgba(${INK},0.55)`;
    ctx.font = `italic 19px ${SERIF}`;
    ctx.fillText(TAGLINE, cx, 92);

    // Category title
    const baseline = HEADER_H + 58;
    ctx.fillStyle = C.espresso;
    ctx.font = `bold 46px ${SERIF}`;
    ctx.fillText(truncateToWidth(ctx, page.category, width - PAD * 2), cx, baseline);

    // Short accent rule
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 44, baseline + 22);
    ctx.lineTo(cx + 44, baseline + 22);
    ctx.stroke();
    ctx.lineCap = "butt";

    if (page.totalParts > 1) {
        ctx.fillStyle = `rgba(${INK},0.5)`;
        ctx.font = `500 16px ${SANS}`;
        ctx.fillText(`${page.part} / ${page.totalParts}`, cx, baseline + 48);
    }

    ctx.textAlign = "left";
    return HEADER_H + CAT_H;
}

function drawFooter(ctx: CanvasRenderingContext2D, height: number, width: number = W): void {
    const y = height - FOOTER_H;
    const cx = width / 2;
    // Hairline rule instead of a heavy colour bar.
    ctx.strokeStyle = `rgba(${INK},0.12)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y + 8);
    ctx.lineTo(width - PAD, y + 8);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.red;
    ctx.font = `600 27px ${SANS}`;
    ctx.fillText(SITE_WEB, cx, y + 54);
    ctx.fillStyle = `rgba(${INK},0.6)`;
    ctx.font = `500 18px ${SANS}`;
    ctx.fillText("Order online · Same-day delivery across Lagos", cx, y + 84);
    ctx.textAlign = "left";
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    });
}

// ─── PNG: list variant (portrait price sheet, 1080×1920) ─────────

const LIST_ROW_H = 88;
const LIST_MAX_ROWS = 14; // rows per portrait slide

function renderListImage(page: CatalogueImagePage): Promise<Blob> {
    const { canvas, ctx } = newCanvas(PHOTO_W, PHOTO_H, C.cream);
    const bodyTop = drawHead(ctx, page, PHOTO_W) + 24;
    const bodyBottom = PHOTO_H - FOOTER_H;

    // Vertically centre the rows so a short list doesn't float at the top.
    const blockH = page.items.length * LIST_ROW_H;
    const top = bodyTop + Math.max(0, (bodyBottom - bodyTop - blockH) / 2);

    const left = PAD;
    const right = PHOTO_W - PAD;
    const priceStyle: PriceStyle = { size: 36, color: C.red, unitColor: "rgba(181,51,46,0.6)" };
    ctx.textBaseline = "alphabetic";

    page.items.forEach((item, idx) => {
        const y = top + idx * LIST_ROW_H;
        if (idx % 2 === 1) {
            ctx.fillStyle = C.creamAlt;
            roundRect(ctx, left - 16, y + 6, right - left + 32, LIST_ROW_H - 12, 14);
            ctx.fill();
        }
        const midY = y + LIST_ROW_H / 2 + 13;
        // Reserve the price's actual width, then fit the name into the gap.
        const priceW = priceWidth(ctx, item.priceLabel, priceStyle);
        ctx.fillStyle = C.espresso;
        ctx.textAlign = "left";
        ctx.font = `500 36px ${SANS}`;
        ctx.fillText(truncateToWidth(ctx, item.name, right - left - priceW - 40), left, midY);
        drawPriceRight(ctx, right, midY, item.priceLabel, priceStyle);
    });

    drawFooter(ctx, PHOTO_H, PHOTO_W);
    return canvasToBlob(canvas);
}

// ─── PNG: photo-card carousel (9:16 portrait / 1080×1920) ────────

const CARD_GAP = 26;
const CARD_RADIUS = 22;
const CARD_PAGE_BG = "#F2E8D8"; // deeper parchment so white cards pop

/**
 * Card typography + spacing scale with the card width, so a denser 2-row grid
 * stays as polished as a single big row. `bodyH` is the fixed text-zone height
 * below the photo (top pad + two name lines + price + bottom pad); the photo
 * takes whatever height remains.
 */
function cardMetrics(w: number): {
    nameSize: number;
    nameLH: number;
    priceSize: number;
    padX: number;
    padY: number;
    nameGap: number;
    bodyH: number;
} {
    const nameSize = Math.max(19, Math.round(w * 0.061));
    const nameLH = Math.round(nameSize * 1.16);
    const priceSize = Math.max(22, Math.round(w * 0.077));
    const padX = Math.max(16, Math.round(w * 0.055));
    const padY = Math.max(12, Math.round(w * 0.038));
    const nameGap = Math.round(padY * 0.6);
    const bodyH = padY + nameLH * 2 + nameGap + priceSize + padY;
    return { nameSize, nameLH, priceSize, padX, padY, nameGap, bodyH };
}

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

    // Name + price scale with the card width.
    const m = cardMetrics(w);
    const bx = x + m.padX;
    ctx.fillStyle = C.espresso;
    ctx.textAlign = "left";
    ctx.font = `600 ${m.nameSize}px ${SANS}`;
    const nameLines = wrapLines(ctx, item.name, w - m.padX * 2, 2);
    const nameBaseline = y + photoH + m.padY + m.nameSize;
    nameLines.forEach((ln, i) => ctx.fillText(ln, bx, nameBaseline + i * m.nameLH));

    // Divider + price anchored to the card bottom
    const priceBaseline = y + cardH - m.padY;
    const dividerY = priceBaseline - m.priceSize - m.nameGap;
    ctx.strokeStyle = "rgba(44,26,14,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, dividerY);
    ctx.lineTo(x + w - m.padX, dividerY);
    ctx.stroke();
    const priceStyle: PriceStyle = { size: m.priceSize, color: C.red, unitColor: "rgba(181,51,46,0.55)" };
    drawPriceLeft(ctx, bx, priceBaseline, item.priceLabel, priceStyle);
}

/** A category slide (9:16 portrait): editorial masthead + a centred grid of cards + footer. */
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

    // Fit rows into the body; cap card height so a sparse slide isn't oversized.
    const { bodyH } = cardMetrics(colW);
    const avail = bodyBottom - bodyTop - 28;
    const cardH = Math.min(
        Math.floor((avail - (rows - 1) * CARD_GAP) / rows),
        Math.round(colW * 0.72) + bodyH,
    );
    const photoH = cardH - bodyH;
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

/** Slide 1 — the carousel hook / cover (9:16 portrait), deep red with an inset frame. */
function renderCoverSlide(): Promise<Blob> {
    const { canvas, ctx } = newCanvas(PHOTO_W, PHOTO_H, C.red);
    const cx = PHOTO_W / 2;

    // Elegant inset hairline frame — reads as a designed title card.
    ctx.strokeStyle = "rgba(253,246,236,0.32)";
    ctx.lineWidth = 2;
    const m = 44;
    roundRect(ctx, m, m, PHOTO_W - m * 2, PHOTO_H - m * 2, 12);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Eyebrow
    ctx.fillStyle = "rgba(253,246,236,0.82)";
    ctx.font = `600 26px ${SANS}`;
    ctx.fillText(spaced("FRESH · CHILLED · FROZEN"), cx, 700);

    // Wordmark
    ctx.fillStyle = C.cream;
    ctx.font = `bold 150px ${SERIF}`;
    ctx.fillText(BRAND_LABEL, cx, 858);

    // Slogan (from the logo)
    ctx.font = `italic 40px ${SERIF}`;
    ctx.fillText(TAGLINE, cx, 936);

    // Divider rule
    ctx.strokeStyle = "rgba(253,246,236,0.4)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 140, 1016);
    ctx.lineTo(cx + 140, 1016);
    ctx.stroke();
    ctx.lineCap = "butt";

    // Sub-title + prompt
    ctx.fillStyle = C.cream;
    ctx.font = `italic 46px ${SERIF}`;
    ctx.fillText("Product Catalogue", cx, 1120);
    ctx.fillStyle = "rgba(253,246,236,0.78)";
    ctx.font = `500 27px ${SANS}`;
    ctx.fillText("Swipe to browse the range  →", cx, 1196);

    // Website URL — featured near the base.
    ctx.fillStyle = C.cream;
    ctx.font = `600 38px ${SANS}`;
    ctx.fillText(SITE_WEB, cx, PHOTO_H - 148);
    ctx.fillStyle = "rgba(253,246,236,0.78)";
    ctx.font = `400 25px ${SANS}`;
    ctx.fillText("Same-day delivery across Lagos", cx, PHOTO_H - 106);

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
        const cover = await renderCoverSlide();
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

    const pages = chunkSectionsBalanced(sections, LIST_MAX_ROWS);
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

    // Title block (first page)
    doc.setTextColor(...hexToRgb(C.espresso));
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.text("Product Catalogue", margin, bannerH + 34);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(120, 96, 74);
    doc.text(
        "Fresh, chilled & frozen — all prices in Naira (₦). Subject to change and availability.",
        margin,
        bannerH + 52,
    );

    let startY = bannerH + 68;

    for (const section of sections) {
        autoTable(doc, {
            startY,
            margin: { top: bannerH + 18, left: margin, right: margin, bottom: 48 },
            head: [[section.category.toUpperCase(), "PRICE"]],
            body: section.items.map((i) => [i.name, i.priceLabel]),
            theme: "striped",
            styles: { font: "helvetica", lineColor: hexToRgb(C.creamAlt), lineWidth: 0.1 },
            headStyles: {
                fillColor: hexToRgb(C.green),
                textColor: hexToRgb(C.cream),
                fontStyle: "bold",
                fontSize: 11,
                cellPadding: { top: 8, bottom: 8, left: 12, right: 12 },
            },
            bodyStyles: {
                textColor: hexToRgb(C.espresso),
                fontSize: 11,
                cellPadding: { top: 7, bottom: 7, left: 12, right: 12 },
            },
            alternateRowStyles: { fillColor: hexToRgb(C.creamAlt) },
            columnStyles: {
                0: { cellWidth: "auto" },
                1: { halign: "right", cellWidth: 140, fontStyle: "bold", textColor: hexToRgb(C.red) },
            },
            didParseCell: (data) => {
                if (data.section === "head" && data.column.index === 1) data.cell.styles.halign = "right";
            },
            didDrawPage: (data) => chrome(data.pageNumber),
        });
        // @ts-expect-error lastAutoTable is attached by the plugin at runtime
        startY = doc.lastAutoTable.finalY + 20;
    }

    doc.save(`${slugify(SITE_NAME)}-catalogue-prices-${dateStamp()}.pdf`);
}

async function generatePhotoPdf(sections: CatalogueSection[]): Promise<void> {
    const images = await preloadImages(sections);
    const { doc, pageW, pageH, margin, bannerH, chrome } = await makePdf();

    const cols = 2;
    const gap = 20;
    const colW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
    const photoH = Math.round(colW * 0.7);
    const bodyH = 50;
    const cardH = photoH + bodyH;
    const rowGap = 20;
    const headerH = 30;
    const headerGap = 16;
    const catGap = 12; // extra breathing room before a new category
    const top = bannerH + 26;
    const bottom = pageH - 54; // clears the footer chrome (rule + contact line)

    let y = top;
    let col = 0;

    const catHeader = (label: string, continued = false): void => {
        doc.setFillColor(...hexToRgb(C.green));
        doc.rect(margin, y, pageW - margin * 2, headerH, "F");
        doc.setTextColor(...hexToRgb(C.cream));
        doc.setFont("times", "bold");
        doc.setFontSize(13);
        doc.text(label.toUpperCase(), margin + 12, y + 20);
        if (continued) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.text("(cont.)", pageW - margin - 10, y + 20, { align: "right" });
        }
        y += headerH + headerGap;
    };

    const drawCard = (item: CatalogueSection["items"][number], x: number): void => {
        // Card outline
        doc.setDrawColor(...hexToRgb(C.creamAlt));
        doc.setLineWidth(0.75);
        doc.rect(x, y, colW, cardH, "S");

        // Photo area (contain-fit on a tinted box; jsPDF can't source-crop)
        doc.setFillColor(...hexToRgb(C.creamAlt));
        doc.rect(x, y, colW, photoH, "F");
        const img = item.image ? images.get(item.image) : undefined;
        const jpeg = img ? imgToJpeg(img) : null;
        if (jpeg) {
            const fit = Math.min(colW / jpeg.w, photoH / jpeg.h);
            const dw = jpeg.w * fit;
            const dh = jpeg.h * fit;
            doc.addImage(jpeg.data, "JPEG", x + (colW - dw) / 2, y + (photoH - dh) / 2, dw, dh);
        } else {
            doc.setTextColor(...hexToRgb(C.green));
            doc.setFont("times", "bold");
            doc.setFontSize(30);
            doc.text((item.name.trim()[0] || "•").toUpperCase(), x + colW / 2, y + photoH / 2 + 10, {
                align: "center",
            });
        }
        doc.setDrawColor(...hexToRgb(C.creamAlt));
        doc.line(x, y + photoH, x + colW, y + photoH);

        // Name (≤2 lines) + price, kept inside the card body
        doc.setTextColor(...hexToRgb(C.espresso));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        const nameLines = (doc.splitTextToSize(item.name, colW - 16) as string[]).slice(0, 2);
        nameLines.forEach((ln, i) => doc.text(ln, x + 8, y + photoH + 15 + i * 12));
        doc.setTextColor(...hexToRgb(C.red));
        doc.setFontSize(10.5);
        doc.text(item.priceLabel, x + 8, y + cardH - 9);
    };

    sections.forEach((section, sIdx) => {
        if (col !== 0) {
            col = 0;
            y += cardH + rowGap;
        }
        if (sIdx > 0) y += catGap;
        // Keep the header with at least its first row of cards.
        if (y + headerH + headerGap + cardH > bottom) {
            doc.addPage();
            y = top;
            col = 0;
        }
        catHeader(section.category);

        for (const item of section.items) {
            if (col === 0 && y + cardH > bottom) {
                doc.addPage();
                y = top;
                col = 0;
                catHeader(section.category, true); // repeat header on continuation
            }
            drawCard(item, margin + col * (colW + gap));
            col += 1;
            if (col >= cols) {
                col = 0;
                y += cardH + rowGap;
            }
        }
    });

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
