import { getSupabaseClient } from "@/lib/supabase-client";

export const DAILY_STAMP_LIMIT_BYTES = 10 * 1024;

const STAMPS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STAMPS_BUCKET ?? "stamps";

function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getStoragePath(userId: string, dateStr: string): string {
  const monthKey = dateStr.slice(0, 7);
  return `${userId}/${monthKey}/${dateStr}.webp`;
}

export async function loadStampsFromSupabase(
  userId: string,
  year: number,
  month: number,
): Promise<Map<string, string>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  const monthKey = getMonthKey(year, month);
  const folder = `${userId}/${monthKey}`;

  const { data: files, error } = await supabase.storage
    .from(STAMPS_BUCKET)
    .list(folder, {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    throw new Error(error.message);
  }

  const stampEntries = await Promise.all(
    (files ?? [])
      .filter((file) => file.name.endsWith(".webp"))
      .map(async (file) => {
        const dateStr = file.name.replace(/\.webp$/, "");
        const filePath = `${folder}/${file.name}`;
        const { data, error: downloadError } = await supabase.storage
          .from(STAMPS_BUCKET)
          .download(filePath);

        if (downloadError || !data) {
          return null;
        }

        return [dateStr, URL.createObjectURL(data)] as const;
      }),
  );

  const stamps = new Map<string, string>();
  for (const entry of stampEntries) {
    if (entry) {
      stamps.set(entry[0], entry[1]);
    }
  }

  return stamps;
}

export async function saveStampToSupabase(
  userId: string,
  dateStr: string,
  blob: Blob,
): Promise<void> {
  if (blob.size > DAILY_STAMP_LIMIT_BYTES) {
    throw new Error("Stamp must be 10KB or less.");
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  const path = getStoragePath(userId, dateStr);

  const { error } = await supabase.storage
    .from(STAMPS_BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: "image/webp",
      cacheControl: "31536000",
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteStampFromSupabase(
  userId: string,
  dateStr: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  const path = getStoragePath(userId, dateStr);
  const { error } = await supabase.storage.from(STAMPS_BUCKET).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}
