import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, STAMPS_BUCKET } from "@/lib/supabase-admin";
import { DAILY_STAMP_LIMIT_BYTES } from "@/lib/supabase-stamps";

function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getStoragePath(userId: string, dateStr: string): string {
  const monthKey = dateStr.slice(0, 7);
  return `${userId}/${monthKey}/${dateStr}.webp`;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  }

  const monthKey = getMonthKey(year, month);
  const folder = `${userId}/${monthKey}`;

  const supabaseAdmin = getSupabaseAdmin();
  const { data: files, error } = await supabaseAdmin.storage
    .from(STAMPS_BUCKET)
    .list(folder, {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const webpFiles = (files ?? []).filter((file) => file.name.endsWith(".webp"));

  if (webpFiles.length === 0) {
    return NextResponse.json({ stamps: [] });
  }

  // Single batch call instead of N individual createSignedUrl calls
  const paths = webpFiles.map((file) => `${folder}/${file.name}`);
  const { data: signedUrls, error: signedError } = await supabaseAdmin.storage
    .from(STAMPS_BUCKET)
    .createSignedUrls(paths, 60 * 60 * 24 * 7); // 7-day expiry

  if (signedError || !signedUrls) {
    return NextResponse.json(
      { error: signedError?.message ?? "Failed to sign URLs" },
      { status: 500 },
    );
  }

  const stamps = signedUrls
    .map((entry, i) => {
      if (!entry.signedUrl) return null;
      const dateStr = webpFiles[i].name.replace(/\.webp$/, "");
      return { dateStr, url: entry.signedUrl };
    })
    .filter(Boolean);

  return NextResponse.json(
    { stamps },
    {
      headers: {
        // Allow the browser to cache the signed-URL list for 5 minutes
        // (signed URLs themselves are valid for 7 days)
        "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
      },
    },
  );
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const dateStr = formData.get("dateStr");
  const file = formData.get("file");

  if (typeof dateStr !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (file.size > DAILY_STAMP_LIMIT_BYTES) {
    return NextResponse.json(
      { error: "Stamp must be 10KB or less." },
      { status: 400 },
    );
  }

  const path = getStoragePath(userId, dateStr);
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage
    .from(STAMPS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: "image/webp",
      cacheControl: "31536000",
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from(STAMPS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7-day expiry

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: signedError?.message ?? "Failed to create signed URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, url: signedData.signedUrl });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateStr = url.searchParams.get("dateStr");

  if (!dateStr) {
    return NextResponse.json({ error: "Missing dateStr" }, { status: 400 });
  }

  const path = getStoragePath(userId, dateStr);
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage
    .from(STAMPS_BUCKET)
    .remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
