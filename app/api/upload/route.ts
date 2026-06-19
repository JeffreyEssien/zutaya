import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentAdmin } from "@/lib/adminAuth";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Upload limits. The proxy POST is only meant for small files (real uploads go
// browser→Cloudinary via the signed GET), so cap conservatively.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

async function sha1(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Magic-byte guard. `file.type` (the MIME) is client-controlled and trivially
 * spoofed (rename evil.exe → image/png), so we sniff the real header. We only
 * REJECT on signatures that are clearly NOT media (executables, archives, PDFs,
 * shell scripts). Genuine media — including uncommon/new formats whose
 * signature we don't recognise — is allowed, so this can't reject a real photo
 * or video. (SVG is intentionally not blocked here; it starts with '<'.)
 */
function looksDangerous(bytes: Uint8Array): boolean {
  const b = (i: number) => bytes[i];
  // Windows PE (MZ)
  if (b(0) === 0x4d && b(1) === 0x5a) return true;
  // ELF (Linux exe)
  if (b(0) === 0x7f && b(1) === 0x45 && b(2) === 0x4c && b(3) === 0x46) return true;
  // ZIP / Office / JAR (PK..)
  if (b(0) === 0x50 && b(1) === 0x4b && (b(2) === 0x03 || b(2) === 0x05 || b(2) === 0x07)) return true;
  // PDF (%PDF)
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return true;
  // Shell shebang (#!)
  if (b(0) === 0x23 && b(1) === 0x21) return true;
  // Mach-O (macOS exe) — common magics incl. fat/universal (CAFEBABE)
  const m32 = (b(0) << 24) | (b(1) << 16) | (b(2) << 8) | b(3);
  if ([0xfeedface, 0xfeedfacf, 0xcafebabe, 0xcffaedfe, 0xcefaedfe].includes(m32 >>> 0)) return true;
  return false;
}

/**
 * GET  — return a Cloudinary signature for direct browser upload
 * POST — proxy upload for small files (kept for backward compat, <4 MB)
 */

export async function GET(req: NextRequest) {
  const c = await cookies();
  if (!c.get("admin_session")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "Cloudinary not configured" },
      { status: 500 },
    );
  }

  const folder =
    req.nextUrl.searchParams.get("folder") || "zutaya";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await sha1(
    `folder=${folder}&timestamp=${timestamp}${API_SECRET}`,
  );

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: API_KEY,
    cloudName: CLOUD_NAME,
    folder,
  });
}

export async function POST(req: NextRequest) {
  // Admin-only — this proxies straight to Cloudinary, so it must not be public.
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "Cloudinary not configured" },
      { status: 500 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 1. MIME allowlist — only images and videos.
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    return NextResponse.json(
      { error: "Only image and video files are allowed." },
      { status: 415 },
    );
  }

  // 2. Size cap (per category).
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(maxBytes / 1024 / 1024)} MB for ${isVideo ? "videos" : "images"}.` },
      { status: 413 },
    );
  }

  // 3. Verify the real bytes aren't a spoofed executable/archive (read header only).
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (looksDangerous(header)) {
    return NextResponse.json(
      { error: "File contents don't match an allowed image/video type." },
      { status: 415 },
    );
  }

  const folder = (formData.get("folder") as string) || "zutaya";
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const resourceType = isVideo ? "video" : "image";

  const signature = await sha1(
    `folder=${folder}&timestamp=${timestamp}${API_SECRET}`,
  );

  const uploadForm = new FormData();
  uploadForm.append("file", file);
  uploadForm.append("api_key", API_KEY);
  uploadForm.append("timestamp", timestamp);
  uploadForm.append("signature", signature);
  uploadForm.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: uploadForm },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.error?.message || "Upload failed" },
      { status: res.status },
    );
  }

  const result = await res.json();

  return NextResponse.json({
    url: result.secure_url,
    publicId: result.public_id,
    type: resourceType,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format,
    duration: result.duration,
  });
}
