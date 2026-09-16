// PEM <-> ArrayBuffer conversion helpers for PKCS#8 private keys and SPKI
// public keys. Pure, framework-free. Tool-specific.

import { base64ToBytes, bytesToBase64 } from './base64';

const PEM_LINE_LENGTH = 64;

function stripPemArmor(pem: string): string {
  return pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
}

/**
 * Decodes a PEM-encoded key (its base64 body, ignoring the
 * `-----BEGIN/END-----` armor and any whitespace) into raw DER bytes
 * suitable for `crypto.subtle.importKey('pkcs8' | 'spki', ...)`.
 */
export function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = stripPemArmor(pem);
  if (body === '') {
    throw new Error('Paste a PEM-encoded key (missing or empty PEM content).');
  }
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(body);
  } catch {
    throw new Error('Could not decode PEM: the body is not valid base64.');
  }
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** Wraps raw DER bytes into a `-----BEGIN <label>-----` PEM block, 64-column wrapped. */
export function arrayBufferToPem(der: ArrayBuffer, label: string): string {
  const base64 = bytesToBase64(new Uint8Array(der));
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += PEM_LINE_LENGTH) {
    lines.push(base64.slice(i, i + PEM_LINE_LENGTH));
  }
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}
