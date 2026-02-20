const DB_NAME = "pdf-viewer-cache";
const DB_VERSION = 1;
const STORE_NAME = "pdf-files";
const MAX_CACHE_ENTRIES = 5;
const MAX_CACHE_BYTES = 300 * 1024 * 1024;

type CachedPdfRecord = {
  url: string;
  etag: string | null;
  data: ArrayBuffer;
  size: number;
  lastAccessed: number;
  updatedAt: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

function openDatabase() {
  if (!hasIndexedDb()) {
    return Promise.resolve<IDBDatabase | null>(null);
  }

  if (dbPromise) {
    return dbPromise.then((db) => db);
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "url" });
        store.createIndex("lastAccessed", "lastAccessed", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  }).catch((error) => {
    dbPromise = null;
    throw error;
  });

  return dbPromise.then((db) => db);
}

async function getCachedPdfRecord(url: string) {
  const db = await openDatabase();
  if (!db) {
    return null;
  }

  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const record = await requestToPromise(store.get(url) as IDBRequest<CachedPdfRecord | undefined>);
  await transactionDone(transaction);
  return record ?? null;
}

async function deleteCachedPdfRecord(url: string) {
  const db = await openDatabase();
  if (!db) {
    return;
  }

  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(url);
  await transactionDone(transaction);
}

function looksLikePdf(buffer: ArrayBuffer) {
  if (buffer.byteLength < 8) {
    return false;
  }

  const bytes = new Uint8Array(buffer);
  const probeLength = Math.min(bytes.length, 1024);
  for (let i = 0; i <= probeLength - 5; i += 1) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return true;
    }
  }
  return false;
}

async function upsertCachedPdfRecord(
  url: string,
  data: ArrayBuffer,
  etag: string | null,
  lastAccessed: number,
) {
  const db = await openDatabase();
  if (!db) {
    return;
  }

  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const record: CachedPdfRecord = {
    url,
    data,
    etag,
    size: data.byteLength,
    lastAccessed,
    updatedAt: Date.now(),
  };
  store.put(record);
  await transactionDone(transaction);
}

async function touchCachedPdfRecord(record: CachedPdfRecord) {
  const db = await openDatabase();
  if (!db) {
    return;
  }

  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.put({
    ...record,
    lastAccessed: Date.now(),
  });
  await transactionDone(transaction);
}

async function trimCacheIfNeeded() {
  const db = await openDatabase();
  if (!db) {
    return;
  }

  const readTransaction = db.transaction(STORE_NAME, "readonly");
  const readStore = readTransaction.objectStore(STORE_NAME);
  const records = (await requestToPromise(
    readStore.getAll() as IDBRequest<CachedPdfRecord[]>,
  )) as CachedPdfRecord[];
  await transactionDone(readTransaction);

  const totalBytes = records.reduce((sum, record) => sum + record.size, 0);
  if (records.length <= MAX_CACHE_ENTRIES && totalBytes <= MAX_CACHE_BYTES) {
    return;
  }

  const sorted = [...records].sort((a, b) => a.lastAccessed - b.lastAccessed);
  let nextBytes = totalBytes;
  const removeUrls: string[] = [];
  for (const record of sorted) {
    if (sorted.length - removeUrls.length <= MAX_CACHE_ENTRIES && nextBytes <= MAX_CACHE_BYTES) {
      break;
    }
    removeUrls.push(record.url);
    nextBytes -= record.size;
  }

  if (removeUrls.length === 0) {
    return;
  }

  const writeTransaction = db.transaction(STORE_NAME, "readwrite");
  const writeStore = writeTransaction.objectStore(STORE_NAME);
  for (const url of removeUrls) {
    writeStore.delete(url);
  }
  await transactionDone(writeTransaction);
}

async function fetchPdf(url: string, etag: string | null) {
  const headers = new Headers();
  if (etag) {
    headers.set("If-None-Match", etag);
  }

  return fetch(url, {
    cache: "no-cache",
    headers,
  });
}

async function revalidateCachedPdfInBackground(url: string, cached: CachedPdfRecord) {
  try {
    const response = await fetchPdf(url, cached.etag);
    if (response.status === 304) {
      await touchCachedPdfRecord(cached);
      return;
    }

    if (!response.ok) {
      return;
    }

    const data = await response.arrayBuffer();
    await upsertCachedPdfRecord(url, data, response.headers.get("etag"), Date.now());
    await trimCacheIfNeeded();
  } catch {
    // Keep stale cache when revalidation fails.
  }
}

async function cachePdfFromResponse(url: string, response: Response) {
  if (!response.ok) {
    return;
  }
  const data = await response.arrayBuffer();
  if (!looksLikePdf(data)) {
    return;
  }
  await upsertCachedPdfRecord(url, data, response.headers.get("etag"), Date.now());
  await trimCacheIfNeeded();
}

export async function getCachedPdfBytes(url: string) {
  if (!hasIndexedDb()) {
    return null;
  }

  const cached = await getCachedPdfRecord(url);
  if (!cached) {
    return null;
  }
  if (!looksLikePdf(cached.data)) {
    await deleteCachedPdfRecord(url);
    return null;
  }

  void revalidateCachedPdfInBackground(url, cached);
  return new Uint8Array(cached.data.slice(0));
}

export async function cachePdfInBackground(url: string) {
  if (!hasIndexedDb()) {
    return;
  }

  try {
    const cached = await getCachedPdfRecord(url);
    const response = await fetchPdf(url, cached?.etag ?? null);
    if (response.status === 304) {
      if (cached) {
        await touchCachedPdfRecord(cached);
      }
      return;
    }
    await cachePdfFromResponse(url, response);
  } catch {
    // Ignore background cache failures.
  }
}
