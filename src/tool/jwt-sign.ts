// Core JWT signing logic, entirely via the browser's native WebCrypto API
// (`crypto.subtle`) — no JWT or crypto library dependency. Pure/async,
// framework-free. Tool-specific.

import { base64ToBytes, bytesToBase64Url, utf8ToBase64Url } from './base64';
import { pemToArrayBuffer } from './pem';

export type JwtAlgorithm =
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'PS256'
  | 'PS384'
  | 'PS512'
  | 'ES256'
  | 'ES384';

export type AlgorithmFamily = 'HMAC' | 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'ECDSA';

export type EcAlgorithm = 'ES256' | 'ES384';

/** The signing key material supplied by the user, matched to the chosen algorithm's family. */
export type SigningKeyInput =
  | { kind: 'secret'; secret: string; isBase64: boolean }
  | { kind: 'pem'; pem: string };

export interface SignJwtResult {
  /** The full compact JWT: `header.payload.signature`. */
  token: string;
  /** The header, pretty-printed, as actually signed. */
  headerJson: string;
  /** The payload, pretty-printed, as actually signed. */
  payloadJson: string;
}

export function algorithmFamily(alg: JwtAlgorithm): AlgorithmFamily {
  if (alg.startsWith('HS')) return 'HMAC';
  if (alg.startsWith('RS')) return 'RSASSA-PKCS1-v1_5';
  if (alg.startsWith('PS')) return 'RSA-PSS';
  return 'ECDSA';
}

export function hashForAlg(alg: JwtAlgorithm): 'SHA-256' | 'SHA-384' | 'SHA-512' {
  if (alg.endsWith('256')) return 'SHA-256';
  if (alg.endsWith('384')) return 'SHA-384';
  return 'SHA-512';
}

/** The P-256/P-384 curve WebCrypto must use for ES256/ES384, per RFC 7518. */
export function curveForAlg(alg: EcAlgorithm): 'P-256' | 'P-384' {
  return alg === 'ES256' ? 'P-256' : 'P-384';
}

function rsaPssSaltLength(alg: JwtAlgorithm): number {
  const hash = hashForAlg(alg);
  if (hash === 'SHA-256') return 32;
  if (hash === 'SHA-384') return 48;
  return 64;
}

async function importSigningKey(alg: JwtAlgorithm, input: SigningKeyInput): Promise<CryptoKey> {
  const family = algorithmFamily(alg);

  if (family === 'HMAC') {
    if (input.kind !== 'secret') {
      throw new Error(`${alg} requires a secret, not a PEM key.`);
    }
    if (input.secret === '') {
      throw new Error('Enter a secret to sign with.');
    }
    let keyBytes: Uint8Array<ArrayBuffer>;
    if (input.isBase64) {
      try {
        keyBytes = base64ToBytes(input.secret.trim());
      } catch {
        throw new Error('Secret is marked as base64-encoded but is not valid base64.');
      }
    } else {
      keyBytes = new TextEncoder().encode(input.secret);
    }
    return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: hashForAlg(alg) }, false, [
      'sign',
    ]);
  }

  if (input.kind !== 'pem') {
    throw new Error(`${alg} requires a PKCS#8 private key PEM, not a secret.`);
  }
  const keyData = pemToArrayBuffer(input.pem);

  if (family === 'RSASSA-PKCS1-v1_5' || family === 'RSA-PSS') {
    return crypto.subtle.importKey('pkcs8', keyData, { name: family, hash: hashForAlg(alg) }, false, [
      'sign',
    ]);
  }

  const namedCurve = curveForAlg(alg as EcAlgorithm);
  return crypto.subtle.importKey('pkcs8', keyData, { name: 'ECDSA', namedCurve }, false, ['sign']);
}

async function signData(alg: JwtAlgorithm, key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  const family = algorithmFamily(alg);

  if (family === 'HMAC') {
    return crypto.subtle.sign('HMAC', key, data);
  }
  if (family === 'RSASSA-PKCS1-v1_5') {
    return crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
  }
  if (family === 'RSA-PSS') {
    return crypto.subtle.sign({ name: 'RSA-PSS', saltLength: rsaPssSaltLength(alg) }, key, data);
  }
  // ECDSA: WebCrypto's `sign` produces the raw (r||s) IEEE P1363 signature
  // format, which is exactly what JWS/JWT expects (as opposed to DER).
  return crypto.subtle.sign({ name: 'ECDSA', hash: hashForAlg(alg) }, key, data);
}

function parsePayload(payloadJsonText: string): Record<string, unknown> {
  const trimmed = payloadJsonText.trim();
  let parsed: unknown;
  try {
    parsed = trimmed === '' ? {} : JSON.parse(trimmed);
  } catch (err) {
    throw new Error(`Payload is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Payload must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

/**
 * Builds and signs a compact JWT from a JSON payload text, entirely
 * client-side via WebCrypto. Never sends any input over the network.
 */
export async function signJwt(
  alg: JwtAlgorithm,
  headerExtra: Record<string, unknown>,
  payloadJsonText: string,
  keyInput: SigningKeyInput,
): Promise<SignJwtResult> {
  const payload = parsePayload(payloadJsonText);
  const header = { alg, typ: 'JWT', ...headerExtra };

  const headerJson = JSON.stringify(header);
  const payloadJson = JSON.stringify(payload);

  const encodedHeader = utf8ToBase64Url(headerJson);
  const encodedPayload = utf8ToBase64Url(payloadJson);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importSigningKey(alg, keyInput);
  const signature = await signData(alg, key, new TextEncoder().encode(signingInput));
  const encodedSignature = bytesToBase64Url(new Uint8Array(signature));

  return {
    token: `${signingInput}.${encodedSignature}`,
    headerJson,
    payloadJson,
  };
}
