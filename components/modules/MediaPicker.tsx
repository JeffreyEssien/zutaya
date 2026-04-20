"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { MediaItem } from "@/types";
import { toast } from "sonner";
import {
  Upload, Check, Film, Search, X, Loader2, ImageIcon,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  multiple?: boolean;
  filterType?: "image" | "video" | "all";
  title?: string;
}

export default function MediaPicker({
  open,
  onClose,
  onSelect,
  multiple = false,
  filterType = "all",
  title = "Select from Gallery",
}: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const params = filterType !== "all" ? `?type=${filterType}` : "";
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
  }, [filterType]);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch("");
      fetchMedia();
    }
  }, [open, fetchMedia]);

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        // Get signature for direct Cloudinary upload
        const sigRes = await fetch("/api/upload?folder=zutaya");
        if (!sigRes.ok) throw new Error("Failed to get upload signature");
        const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json();

        const isVideo = file.type.startsWith("video/");
        const resourceType = isVideo ? "video" : "image";

        // Upload directly to Cloudinary (bypasses server body limits)
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("api_key", apiKey);
        uploadForm.append("timestamp", timestamp);
        uploadForm.append("signature", signature);
        uploadForm.append("folder", folder);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
          { method: "POST", body: uploadForm },
        );
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.error?.message || "Upload failed");
        }
        const cloudData = await uploadRes.json();

        // Save to media gallery DB
        await fetch("/api/media", {
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
      } catch (err: any) {
        toast.error(`Failed: ${file.name} — ${err.message || "Unknown error"}`);
      }
    }
    setUploading(false);
    fetchMedia();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (!multiple) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const items = media.filter((m) => selected.has(m.id));
    onSelect(items);
    onClose();
  };

  const filtered = media.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white/[0.04] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-dark/8">
          <h2 className="font-serif text-lg text-warm-cream">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-dark/5 transition-colors cursor-pointer">
            <X size={18} className="text-warm-cream/40" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-brand-dark/5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-cream/30" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-brand-dark/[0.03] border border-brand-dark/8 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
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
            accept={filterType === "video" ? "video/*" : filterType === "image" ? "image/*" : "image/*,video/*"}
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-warm-cream/30" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <ImageIcon size={40} className="mx-auto mb-3 text-warm-cream/15" />
              <p className="text-sm text-warm-cream/40">
                {media.length === 0 ? "No media uploaded yet" : "No results"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSelect(item.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                    selected.has(item.id) ? "border-brand-red ring-2 ring-brand-red/20" : "border-transparent hover:border-brand-dark/10"
                  }`}
                >
                  {item.type === "video" ? (
                    <>
                      <img
                        src={item.url.replace(/\.[^.]+$/, ".jpg")}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                          <Film size={14} className="text-white" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <Image
                      src={item.url}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                  {/* Selected check */}
                  <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    selected.has(item.id) ? "bg-brand-red" : "bg-black/30 opacity-0 group-hover:opacity-100"
                  }`}>
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>

                  {/* Name */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-white truncate">{item.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-brand-dark/8 bg-brand-dark/[0.02]">
          <p className="text-xs text-warm-cream/40">
            {selected.size} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="!bg-brand-red !text-white hover:!bg-brand-red/90"
            >
              {multiple ? `Select (${selected.size})` : "Select"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
