export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024;
export const RECEIPT_ACCEPT = "image/*,application/pdf";
export const RECEIPT_VALIDATION_MESSAGE = "Le reçu doit être une image JPG, PNG, WEBP, HEIC/HEIF ou un PDF de 10 Mo ou moins.";

const MIME_TO_EXTENSION = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
  ["application/pdf", "pdf"],
]);

const EXTENSION_TO_MIME = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["heic", "image/heic"],
  ["heif", "image/heif"],
  ["pdf", "application/pdf"],
]);

function extensionFromName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension && EXTENSION_TO_MIME.has(extension) ? extension : null;
}

export function resolveReceiptFileType(file: File) {
  const mimeType = file.type.toLowerCase();
  const directExtension = MIME_TO_EXTENSION.get(mimeType);
  if (directExtension) {
    return {
      contentType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
      extension: directExtension,
    };
  }

  const extension = extensionFromName(file.name);
  if (!extension) return null;

  return {
    contentType: EXTENSION_TO_MIME.get(extension)!,
    extension: extension === "jpeg" ? "jpg" : extension,
  };
}
