export type StoredFile = {
  provider: "vercel-blob";
  pathname: string;
  url: string;
  downloadUrl: string;
  contentType: string | null;
  size: number;
};

export type StoragePutInput = {
  file: File;
  pathname: string;
};

export type StorageGetInput = {
  pathname: string;
};

export type StorageGetResult = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  contentDisposition: string;
  size: number | null;
};

export type FileStorage = {
  put(input: StoragePutInput): Promise<StoredFile>;
  get(input: StorageGetInput): Promise<StorageGetResult | null>;
  delete(pathname: string): Promise<void>;
};

class VercelBlobStorage implements FileStorage {
  async put({ file, pathname }: StoragePutInput): Promise<StoredFile> {
    const { put } = await import("@vercel/blob");
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type || undefined,
    });

    return {
      provider: "vercel-blob",
      pathname: blob.pathname,
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      contentType: blob.contentType ?? file.type ?? null,
      size: file.size,
    };
  }

  async get({ pathname }: StorageGetInput): Promise<StorageGetResult | null> {
    const { get } = await import("@vercel/blob");
    const result = await get(pathname, { access: "private" });

    if (result?.statusCode !== 200 || !result.stream) {
      return null;
    }

    return {
      stream: result.stream,
      contentType: result.blob.contentType ?? "application/octet-stream",
      contentDisposition: result.blob.contentDisposition,
      size: result.blob.size,
    };
  }

  async delete(pathname: string): Promise<void> {
    const { del } = await import("@vercel/blob");
    await del(pathname);
  }
}

export function getFileStorage(): FileStorage {
  return new VercelBlobStorage();
}

export function sanitizeStorageFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "justificatif";
}
