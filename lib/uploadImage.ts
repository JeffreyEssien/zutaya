/**
 * Upload a file to Cloudinary via direct browser upload (signed).
 * Returns the public URL of the uploaded file, or throws on error.
 */
export async function uploadProductImage(
  file: File,
  folder = "zutaya",
): Promise<string> {
  // Get signature from our API
  const sigRes = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`);
  if (!sigRes.ok) throw new Error("Failed to get upload signature");
  const { signature, timestamp, apiKey, cloudName, folder: f } = await sigRes.json();

  const isVideo = file.type.startsWith("video/");
  const resourceType = isVideo ? "video" : "image";

  // Upload directly to Cloudinary
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);
  form.append("folder", f);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Upload failed" } }));
    throw new Error(err.error?.message || "Upload failed");
  }

  const data = await res.json();
  return data.secure_url;
}
