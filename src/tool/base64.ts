// Base64 / Base64URL conversion helpers. Pure, framework-free. Tool-specific.

/** Encodes raw bytes as standard base64. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Decodes standard base64 into raw bytes. Throws on invalid input. */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64ToBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBase64(base64url: string): string {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return padded + '='.repeat(padLength);
}

/** Encodes raw bytes as unpadded base64url (JWS/JWT compact-serialization alphabet). */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return base64ToBase64Url(bytesToBase64(bytes));
}

/** Decodes base64url (padded or not) into raw bytes. Throws on invalid input. */
export function base64UrlToBytes(base64url: string): Uint8Array {
  return base64ToBytes(base64UrlToBase64(base64url));
}

/** Encodes a UTF-8 string as base64url, as used for JWT header/payload segments. */
export function utf8ToBase64Url(text: string): string {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

/** Decodes a base64url segment back into a UTF-8 string. */
export function base64UrlToUtf8(base64url: string): string {
  return new TextDecoder().decode(base64UrlToBytes(base64url));
}
