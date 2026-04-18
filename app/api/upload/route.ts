import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

async function sha1(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  const folder = (formData.get("folder") as string) || "zutaya";
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const isVideo = file.type.startsWith("video/");
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
