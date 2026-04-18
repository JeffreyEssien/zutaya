import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

async function requireAdmin() {
  const c = await cookies();
  return !!c.get("admin_session")?.value;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — list all media, newest first
export async function GET(req: NextRequest) {
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const type = req.nextUrl.searchParams.get("type"); // "image" | "video" | null (all)
  let query = sb.from("media").select("*").order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — save uploaded media record to DB
export async function POST(req: NextRequest) {
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = await req.json();
  const { url, publicId, type, name, folder, width, height, bytes } = body;

  if (!url || !name) {
    return NextResponse.json({ error: "url and name are required" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("media")
    .insert({
      url,
      public_id: publicId || null,
      type: type || "image",
      name,
      folder: folder || "zutaya",
      width: width || null,
      height: height || null,
      size_bytes: bytes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — rename a media item
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { id, name } = await req.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "id and name are required" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("media")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — remove a media record
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Optionally delete from Cloudinary too
  const { data: media } = await sb.from("media").select("public_id, type").eq("id", id).single();
  if (media?.public_id && process.env.CLOUDINARY_CLOUD_NAME) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const secret = process.env.CLOUDINARY_API_SECRET!;
    const toSign = `public_id=${media.public_id}&timestamp=${timestamp}${secret}`;
    const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(toSign));
    const signature = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");

    const resourceType = media.type === "video" ? "video" : "image";
    await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_id: media.public_id,
          api_key: process.env.CLOUDINARY_API_KEY,
          timestamp,
          signature,
        }),
      },
    ).catch(() => {});
  }

  const { error } = await sb.from("media").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
