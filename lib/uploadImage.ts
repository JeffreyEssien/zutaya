interface UploadSignature {
  signature: string;
  timestamp: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

interface CloudinaryResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

/** Optional: also register the uploaded asset in the gallery (media table). */
interface UploadOptions {
  /** Gallery label — e.g. the product name. When set, the asset is saved to the gallery. */
  galleryName?: string;
}

async function getUploadSignature(folder: string): Promise<UploadSignature> {
  const sigRes = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`);
  if (!sigRes.ok) throw new Error("Failed to get upload signature");
  return sigRes.json();
}

async function postToCloudinary(
  cloudName: string,
  resourceType: "image" | "video",
  fields: Record<string, string | File>,
): Promise<CloudinaryResult> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Upload failed" } }));
    throw new Error(err.error?.message || "Upload failed");
  }

  return res.json();
}

/**
 * Save an already-uploaded Cloudinary asset to the gallery (media table).
 * Best-effort — failures are swallowed so they never break the upload flow.
 * `/api/media` de-dupes by public_id, so registering twice is safe.
 */
export async function registerGalleryMedia(media: {
  url: string;
  publicId: string;
  type: "image" | "video";
  name: string;
  folder?: string;
  width?: number;
  height?: number;
  bytes?: number;
}): Promise<void> {
  try {
    await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "zutaya", ...media }),
    });
  } catch {
    // gallery registration is non-critical
  }
}

/**
 * Upload a local file to Cloudinary via direct browser upload (signed).
 * Pass `opts.galleryName` to also save it to the gallery under that label.
 * Returns the public URL of the uploaded file, or throws on error.
 */
export async function uploadProductImage(
  file: File,
  folder = "zutaya",
  opts?: UploadOptions,
): Promise<string> {
  const { signature, timestamp, apiKey, cloudName, folder: f } = await getUploadSignature(folder);
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const data = await postToCloudinary(cloudName, resourceType, {
    file,
    api_key: apiKey,
    timestamp,
    signature,
    folder: f,
  });

  if (opts?.galleryName) {
    await registerGalleryMedia({
      url: data.secure_url,
      publicId: data.public_id,
      type: resourceType,
      name: opts.galleryName,
      folder: f,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
    });
  }

  return data.secure_url;
}

/**
 * Route a remote image URL THROUGH Cloudinary (Cloudinary fetches the remote
 * URL during upload) so every stored image ends up on res.cloudinary.com — no
 * more next/image "hostname not configured" errors from arbitrary pasted links.
 * If the URL is already a Cloudinary asset, it's returned unchanged (not
 * re-registered). Pass `opts.galleryName` to also save it to the gallery.
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  folder = "zutaya",
  opts?: UploadOptions,
): Promise<string> {
  if (/res\.cloudinary\.com/.test(imageUrl)) return imageUrl;
  const { signature, timestamp, apiKey, cloudName, folder: f } = await getUploadSignature(folder);
  const data = await postToCloudinary(cloudName, "image", {
    file: imageUrl,
    api_key: apiKey,
    timestamp,
    signature,
    folder: f,
  });

  if (opts?.galleryName) {
    await registerGalleryMedia({
      url: data.secure_url,
      publicId: data.public_id,
      type: "image",
      name: opts.galleryName,
      folder: f,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
    });
  }

  return data.secure_url;
}
