import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 2 * 1024 * 1024;

const TYPES = [
  { ext: "jpg", mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
] as const;

export class CoverImageError extends Error {}

function matchesMagic(bytes: Uint8Array, magic: readonly number[]) {
  return magic.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array) {
  return (
    bytes.length >= 12 &&
    matchesMagic(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function detectType(bytes: Uint8Array) {
  if (isWebp(bytes)) {
    return { ext: "webp", mime: "image/webp" } as const;
  }
  return TYPES.find((type) => matchesMagic(bytes, type.magic)) ?? null;
}

export function parseCoverImageUrl(raw: string, organizationId?: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("..")) {
    throw new CoverImageError("Cover image path is invalid.");
  }
  if (value.startsWith("/") && !value.startsWith("//")) {
    if (!/^\/[a-zA-Z0-9._\-/]+$/.test(value)) {
      throw new CoverImageError("Cover image path is invalid.");
    }
    const allowedPrefix =
      value.startsWith("/images/") ||
      (organizationId != null && value.startsWith(`/uploads/orgs/${organizationId}/`));
    if (!allowedPrefix) {
      throw new CoverImageError("Cover image path is invalid.");
    }
    return value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CoverImageError("Cover image must be a path or http(s) URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new CoverImageError("Cover image must be a path or http(s) URL.");
  }
  return url.toString();
}

export async function saveOrganizationCover(
  organizationId: string,
  file: File,
): Promise<string> {
  if (file.size === 0) {
    throw new CoverImageError("Choose an image file to upload.");
  }
  if (file.size > MAX_BYTES) {
    throw new CoverImageError("Cover image must be 2MB or smaller.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectType(bytes);
  if (!type) {
    throw new CoverImageError("Cover image must be JPEG, PNG, or WebP.");
  }

  const dir = path.join(process.cwd(), "public", "uploads", "orgs", organizationId);
  await mkdir(dir, { recursive: true });
  const existing = await readdir(dir);
  await Promise.all(
    existing
      .filter((name) => name.startsWith("cover."))
      .map((name) => unlink(path.join(dir, name))),
  );
  const filename = `cover.${type.ext}`;
  await writeFile(path.join(dir, filename), bytes);
  return `/uploads/orgs/${organizationId}/${filename}`;
}
