"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { MediaItem } from "@/types";
import { toast } from "sonner";
import {
  Upload, Trash2, Copy, Check, Film, ImageIcon, Search,
  X, Grid3X3, List, FileVideo, FileImage, Loader2, Pencil,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { logAction } from "@/lib/auditClient";

type ViewMode = "grid" | "list";
type FilterType = "all" | "image" | "video";

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Get Cloudinary video thumbnail — replaces file extension with .jpg */
function videoThumb(url: string) {
  return url.replace(/\.[^.]+$/, ".jpg");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export default function GalleryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const params = filter !== "all" ? `?type=${filter}` : "";
      const res = await fetch(`/api/media${params}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMedia(
          data.map((m: any) => ({
            id: m.id,
            url: m.url,
            publicId: m.public_id,
            type: m.type,
            name: m.name,
            folder: m.folder,
            width: m.width,
            height: m.height,
            sizeBytes: m.size_bytes,
            createdAt: m.created_at,
          })),
        );
      }
    } catch {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    let completed = 0;
    const progressMap = new Map<number, number>();

    const updateProgress = () => {
      const totalPct = Array.from(progressMap.values()).reduce((a, b) => a + b, 0);
      setUploadProgress(Math.round(totalPct / fileArr.length));
    };

    const uploadOne = async (file: File, idx: number) => {
      // 1. Get signature
      const sigRes = await fetch("/api/upload?folder=zutaya");
      if (!sigRes.ok) throw new Error("Failed to get upload signature");
      const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json();

      const isVideo = file.type.startsWith("video/");
      const resourceType = isVideo ? "video" : "image";

      // 2. Upload directly to Cloudinary with progress
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", apiKey);
      form.append("timestamp", timestamp);
      form.append("signature", signature);
      form.append("folder", folder);

      const cloudData: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            progressMap.set(idx, (e.loaded / e.total) * 100);
            updateProgress();
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(form);
      });

      // 3. Save record to DB
      const saveRes = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cloudData.secure_url,
          publicId: cloudData.public_id,
          type: resourceType,
          name: file.name,
          folder: "zutaya",
          width: cloudData.width,
          height: cloudData.height,
          bytes: cloudData.bytes,
        }),
      });
      if (!saveRes.ok) throw new Error("Failed to save");

      completed++;
      progressMap.set(idx, 100);
      updateProgress();
    };

    // Upload up to 3 files in parallel
    const results = await Promise.allSettled(
      fileArr.map((file, idx) => uploadOne(file, idx)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) toast.error(`${failed} file(s) failed to upload`);
    if (completed > 0) toast.success(`Uploaded ${completed} file(s)`);
    logAction("upload", "media", undefined, `Uploaded ${completed} file(s) to gallery`);
    setUploading(false);
    setUploadProgress(0);
    fetchMedia();
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} item(s)?`)) return;
    for (const id of ids) {
      await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    }
    setSelected(new Set());
    logAction("delete", "media", undefined, `Deleted ${ids.length} media item(s)`);
    toast.success(`Deleted ${ids.length} item(s)`);
    fetchMedia();
  };

  const startRename = (item: MediaItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenamingId(item.id);
    setRenameValue(item.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const submitRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await fetch("/api/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: renamingId, name: renameValue.trim() }),
      });
      if (!res.ok) throw new Error();
      setMedia((prev) =>
        prev.map((m) => (m.id === renamingId ? { ...m, name: renameValue.trim() } : m)),
      );
      toast.success("Renamed");
    } catch {
      toast.error("Failed to rename");
    }
    setRenamingId(null);
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("URL copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const filtered = media.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-warm-cream">Media Gallery</h1>
          <p className="text-sm text-warm-cream/50 mt-1">
            {media.length} file{media.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(Array.from(selected))}
              className="!border-red-300 !text-red-600 hover:!bg-red-50"
            >
              <Trash2 size={14} className="mr-1.5" />
              Delete ({selected.size})
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
          >
            <Upload size={14} className="mr-1.5" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/[0.04] rounded-xl border border-warm-cream/8 p-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-cream/30" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-brand-dark/[0.03] border border-warm-cream/8 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/30"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5">
          {(["all", "image", "video"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer capitalize ${
                filter === f
                  ? "bg-brand-red text-white"
                  : "bg-brand-dark/5 text-warm-cream/50 hover:bg-brand-dark/10"
              }`}
            >
              {f === "all" ? "All" : f === "image" ? "Images" : "Videos"}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-brand-dark/5 rounded-lg p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-md cursor-pointer transition-colors ${view === "grid" ? "bg-white/[0.04] shadow-sm text-warm-cream" : "text-warm-cream/40"}`}
          >
            <Grid3X3 size={14} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-md cursor-pointer transition-colors ${view === "list" ? "bg-white/[0.04] shadow-sm text-warm-cream" : "text-warm-cream/40"}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="bg-white/[0.04] rounded-xl border border-warm-cream/8 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 size={16} className="animate-spin text-brand-red" />
            <span className="text-sm text-warm-cream/70">Uploading... {uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-brand-dark/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-red rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Drop zone (when empty or dragging) */}
      {(media.length === 0 && !loading) || dragOver ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            dragOver ? "border-brand-red/40 bg-brand-red/5" : "border-warm-cream/10 bg-brand-dark/[0.02]"
          }`}
        >
          <Upload size={40} className="mx-auto mb-4 text-warm-cream/20" />
          <p className="text-warm-cream/60 font-medium mb-1">
            Drop images or videos here
          </p>
          <p className="text-xs text-warm-cream/40">
            or click Upload to browse files
          </p>
        </div>
      ) : null}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-warm-cream/30" />
        </div>
      )}

      {/* Grid View */}
      {!loading && filtered.length > 0 && view === "grid" && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`group relative bg-white/[0.04] rounded-xl border overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                selected.has(item.id) ? "border-brand-red ring-2 ring-brand-red/20" : "border-warm-cream/8"
              }`}
              onClick={() => toggleSelect(item.id)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-square bg-[#111]">
                {item.type === "video" ? (
                  <img
                    src={videoThumb(item.url)}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={item.url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  />
                )}
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <Film size={16} className="text-white" />
                    </div>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => startRename(item, e)}
                    className="p-2 bg-white/[0.04] rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
                    title="Rename"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(item.url, item.id); }}
                    className="p-2 bg-white/[0.04] rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedId === item.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete([item.id]); }}
                    className="p-2 bg-white/[0.04] rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>

                {/* Selection indicator */}
                <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected.has(item.id) ? "bg-brand-red border-brand-red" : "border-white/60 bg-black/20 opacity-0 group-hover:opacity-100"
                }`}>
                  {selected.has(item.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>

                {/* Type badge */}
                <div className="absolute top-2 right-2">
                  {item.type === "video" ? (
                    <FileVideo size={14} className="text-white/60" />
                  ) : (
                    <FileImage size={14} className="text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5">
                {renamingId === item.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={submitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs font-medium text-warm-cream bg-brand-dark/5 border border-brand-red/30 rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-xs font-medium text-warm-cream truncate"
                    onDoubleClick={(e) => startRename(item, e)}
                    title="Double-click to rename"
                  >
                    {item.name}
                  </p>
                )}
                <p className="text-[10px] text-warm-cream/40 mt-0.5">
                  {item.sizeBytes ? formatBytes(item.sizeBytes) : ""}
                  {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && filtered.length > 0 && view === "list" && (
        <div
          className="bg-white/[0.04] rounded-xl border border-warm-cream/8 divide-y divide-warm-cream/5"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 p-3 hover:bg-brand-dark/[0.02] cursor-pointer transition-colors ${
                selected.has(item.id) ? "bg-brand-red/5" : ""
              }`}
              onClick={() => toggleSelect(item.id)}
            >
              {/* Checkbox */}
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                selected.has(item.id) ? "bg-brand-red border-brand-red" : "border-warm-cream/20"
              }`}>
                {selected.has(item.id) && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>

              {/* Thumb */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#111] shrink-0 relative">
                {item.type === "video" ? (
                  <>
                    <img src={videoThumb(item.url)} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film size={12} className="text-white drop-shadow" />
                    </div>
                  </>
                ) : (
                  <Image src={item.url} alt={item.name} fill className="object-cover" sizes="48px" />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                {renamingId === item.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={submitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm font-medium text-warm-cream bg-brand-dark/5 border border-brand-red/30 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-sm font-medium text-warm-cream truncate"
                    onDoubleClick={(e) => startRename(item, e)}
                    title="Double-click to rename"
                  >
                    {item.name}
                  </p>
                )}
                <p className="text-xs text-warm-cream/40">
                  {item.type} · {item.sizeBytes ? formatBytes(item.sizeBytes) : "unknown size"}
                  {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
                  {item.createdAt ? ` · ${timeAgo(item.createdAt)}` : ""}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => startRename(item, e)}
                  className="p-2 rounded-lg hover:bg-brand-dark/5 text-warm-cream/40 hover:text-warm-cream transition-colors cursor-pointer"
                  title="Rename"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(item.url, item.id); }}
                  className="p-2 rounded-lg hover:bg-brand-dark/5 text-warm-cream/40 hover:text-warm-cream transition-colors cursor-pointer"
                  title="Copy URL"
                >
                  {copiedId === item.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete([item.id]); }}
                  className="p-2 rounded-lg hover:bg-red-50 text-warm-cream/40 hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && media.length > 0 && (
        <div className="text-center py-12">
          <Search size={32} className="mx-auto mb-3 text-warm-cream/15" />
          <p className="text-sm text-warm-cream/40">No files match your search</p>
        </div>
      )}
    </div>
  );
}
