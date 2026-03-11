// cheeze/lib/folder-storage.ts

// ─── File System Access API type augmentations ───────────────────────────────

declare global {
  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?:
        | FileSystemHandle
        | "desktop"
        | "documents"
        | "downloads"
        | "music"
        | "pictures"
        | "videos";
    }): Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<
      FileSystemFileHandle | FileSystemDirectoryHandle
    >;
    queryPermission(descriptor?: {
      mode?: "read" | "readwrite";
    }): Promise<PermissionState>;
    requestPermission(descriptor?: {
      mode?: "read" | "readwrite";
    }): Promise<PermissionState>;
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = "stamp-diary";
const DB_VERSION = 2;
const HANDLES_STORE = "handles";
const STAMPS_STORE = "stamps"; // IDB blob storage fallback
const HANDLE_KEY = "folder-handle";

// ─── Feature detection ───────────────────────────────────────────────────────

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// ─── IndexedDB setup ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // v1: handles store
      if (oldVersion < 1) {
        db.createObjectStore(HANDLES_STORE);
      }
      // v2: stamps blob store (fallback for non-FSAPI browsers)
      if (oldVersion < 2) {
        db.createObjectStore(STAMPS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── IDB blob storage (always available — primary storage layer) ─────────────

async function idbSaveStamp(dateStr: string, blob: Blob): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STAMPS_STORE, "readwrite");
  // Store as { blob, timestamp } so we can add metadata later if needed
  tx.objectStore(STAMPS_STORE).put({ blob, updatedAt: Date.now() }, dateStr);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbDeleteStamp(dateStr: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STAMPS_STORE, "readwrite");
  tx.objectStore(STAMPS_STORE).delete(dateStr);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbLoadStamps(
  year: number,
  month: number,
): Promise<Map<string, string>> {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const stamps = new Map<string, string>();

  const db = await openDB();
  const tx = db.transaction(STAMPS_STORE, "readonly");
  const store = tx.objectStore(STAMPS_STORE);

  // Use a cursor to iterate — filter by prefix
  await new Promise<void>((resolve, reject) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const key = cursor.key as string;
      if (typeof key === "string" && key.startsWith(prefix)) {
        const record = cursor.value as { blob: Blob };
        if (record && record.blob) {
          const url = URL.createObjectURL(record.blob);
          stamps.set(key, url);
        }
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });

  db.close();
  return stamps;
}

/** Check if IDB stamps store has any data (used to determine initial connected state) */
async function idbHasAnyStamps(): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STAMPS_STORE, "readonly");
    const store = tx.objectStore(STAMPS_STORE);
    const countReq = store.count();
    const count = await new Promise<number>((resolve, reject) => {
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => reject(countReq.error);
    });
    db.close();
    return count > 0;
  } catch {
    return false;
  }
}

// ─── File System Access API: directory handle persistence ────────────────────

export async function connectFolder(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new Error(
      "File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.",
    );
  }

  const handle = await window.showDirectoryPicker({ mode: "readwrite" });

  // Verify we can actually write
  const testPerm = await handle.queryPermission({ mode: "readwrite" });
  if (testPerm !== "granted") {
    const requested = await handle.requestPermission({ mode: "readwrite" });
    if (requested !== "granted") {
      throw new Error("Permission to write to this folder was denied.");
    }
  }

  // Persist handle to IndexedDB
  const db = await openDB();
  const tx = db.transaction(HANDLES_STORE, "readwrite");
  tx.objectStore(HANDLES_STORE).put(handle, HANDLE_KEY);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  return handle;
}

export async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;

  try {
    const db = await openDB();
    const tx = db.transaction(HANDLES_STORE, "readonly");
    const request = tx.objectStore(HANDLES_STORE).get(HANDLE_KEY);
    const handle = await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      },
    );
    db.close();
    if (!handle) return null;

    // Check permission — on page reload, browsers require a user gesture
    // to re-grant, so "prompt" means we can't auto-connect.
    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") return handle;

    // Don't try requestPermission here — it needs a user gesture context.
    return null;
  } catch {
    return null;
  }
}

/**
 * Re-request permission on an existing stored handle.
 * Must be called from a user gesture (click handler).
 */
export async function reconnectStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;

  try {
    const db = await openDB();
    const tx = db.transaction(HANDLES_STORE, "readonly");
    const request = tx.objectStore(HANDLES_STORE).get(HANDLE_KEY);
    const handle = await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      },
    );
    db.close();
    if (!handle) return null;

    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") return handle;

    // This is in a user gesture context, so requestPermission should work
    const requested = await handle.requestPermission({ mode: "readwrite" });
    if (requested === "granted") return handle;

    return null;
  } catch {
    return null;
  }
}

// ─── FSAPI file operations ───────────────────────────────────────────────────

async function fsaSaveStamp(
  handle: FileSystemDirectoryHandle,
  dateStr: string,
  blob: Blob,
): Promise<void> {
  const fileName = `${dateStr}.webp`;
  const fileHandle = await handle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function fsaDeleteStamp(
  handle: FileSystemDirectoryHandle,
  dateStr: string,
): Promise<void> {
  const fileName = `${dateStr}.webp`;
  try {
    await handle.removeEntry(fileName);
  } catch {
    // File may not exist
  }
}

async function fsaLoadStamps(
  handle: FileSystemDirectoryHandle,
  year: number,
  month: number,
): Promise<Map<string, string>> {
  const stamps = new Map<string, string>();
  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  try {
    for await (const entry of handle.values()) {
      if (
        entry.kind === "file" &&
        entry.name.endsWith(".webp") &&
        entry.name.startsWith(prefix)
      ) {
        const dateStr = entry.name.replace(".webp", "");
        const file = await entry.getFile();
        const url = URL.createObjectURL(file);
        stamps.set(dateStr, url);
      }
    }
  } catch (err) {
    console.error("Failed to load stamps from folder:", err);
  }

  return stamps;
}

// ─── Unified public API ──────────────────────────────────────────────────────
// IDB is the primary store (always works). FSAPI is an optional sync layer.

/**
 * Save a stamp. Always writes to IDB. If a FSAPI handle is provided, also
 * writes to the filesystem folder.
 */
export async function saveStamp(
  dateStr: string,
  blob: Blob,
  fsHandle: FileSystemDirectoryHandle | null,
): Promise<void> {
  // Always persist to IDB
  await idbSaveStamp(dateStr, blob);

  // Also sync to filesystem if handle is available
  if (fsHandle) {
    try {
      await fsaSaveStamp(fsHandle, dateStr, blob);
    } catch (err) {
      console.error("Failed to sync stamp to folder:", err);
      // Non-fatal — IDB has the data
    }
  }
}

/**
 * Delete a stamp. Removes from IDB and optionally from the filesystem folder.
 */
export async function deleteStamp(
  dateStr: string,
  fsHandle: FileSystemDirectoryHandle | null,
): Promise<void> {
  await idbDeleteStamp(dateStr);

  if (fsHandle) {
    try {
      await fsaDeleteStamp(fsHandle, dateStr);
    } catch (err) {
      console.error("Failed to delete stamp from folder:", err);
    }
  }
}

/**
 * Load stamps for a given month. Reads from IDB. If a FSAPI handle is provided,
 * also merges any stamps found on disk (in case they were added externally).
 */
export async function loadStamps(
  year: number,
  month: number,
  fsHandle: FileSystemDirectoryHandle | null,
): Promise<Map<string, string>> {
  // Start with IDB stamps (always available)
  const stamps = await idbLoadStamps(year, month);

  // If FSAPI handle exists, also load from folder and merge anything new
  if (fsHandle) {
    try {
      const fsStamps = await fsaLoadStamps(fsHandle, year, month);
      for (const [dateStr, url] of fsStamps) {
        if (!stamps.has(dateStr)) {
          stamps.set(dateStr, url);
          // Also backfill into IDB so it's available without FSAPI next time
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            await idbSaveStamp(dateStr, blob);
          } catch {
            // Best-effort backfill
          }
        }
      }
    } catch (err) {
      console.error("Failed to load stamps from folder:", err);
    }
  }

  return stamps;
}

/**
 * Check whether we have any persisted stamps at all (IDB).
 * Used to show "storage active" state even without FSAPI.
 */
export { idbHasAnyStamps };

// ─── Legacy compat aliases (kept so nothing breaks if referenced) ────────────

export const saveStampToFolder = fsaSaveStamp;
export const deleteStampFromFolder = fsaDeleteStamp;
export const loadStampsFromFolder = fsaLoadStamps;
