// Demo key pair generation for the RS*/PS*/ES* algorithms, entirely via
// WebCrypto. Pure/async, framework-free. Tool-specific.

import { arrayBufferToPem } from './pem';
import { algorithmFamily, curveForAlg, hashForAlg, type EcAlgorithm, type JwtAlgorithm } from './jwt-sign';

export interface GeneratedKeyPair {
  /** PKCS#8 PEM, ready to paste into the private-key field. */
  privateKeyPem: string;
  /** SPKI PEM, for sharing/verification purposes. */
  publicKeyPem: string;
}

const RSA_MODULUS_LENGTH = 2048;
const RSA_PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]); // 65537

/**
 * Generates a fresh demo key pair suitable for the given algorithm
 * (RSA 2048 for RS* and PS*, EC P-256/P-384 for ES256/ES384) and exports it as
 * PKCS#8 (private) / SPKI (public) PEM. Not for HMAC algorithms, which use a
 * shared secret instead.
 */
export async function generateDemoKeyPair(alg: JwtAlgorithm): Promise<GeneratedKeyPair> {
  const family = algorithmFamily(alg);
  let keyPair: CryptoKeyPair;

  if (family === 'RSASSA-PKCS1-v1_5' || family === 'RSA-PSS') {
    keyPair = await crypto.subtle.generateKey(
      {
        name: family,
        modulusLength: RSA_MODULUS_LENGTH,
        publicExponent: RSA_PUBLIC_EXPONENT,
        hash: hashForAlg(alg),
      },
      true,
      ['sign', 'verify'],
    );
  } else if (family === 'ECDSA') {
    keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: curveForAlg(alg as EcAlgorithm) },
      true,
      ['sign', 'verify'],
    );
  } else {
    throw new Error(`${alg} uses a shared secret, not a key pair.`);
  }

  const [privateKeyDer, publicKeyDer] = await Promise.all([
    crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
    crypto.subtle.exportKey('spki', keyPair.publicKey),
  ]);

  return {
    privateKeyPem: arrayBufferToPem(privateKeyDer, 'PRIVATE KEY'),
    publicKeyPem: arrayBufferToPem(publicKeyDer, 'PUBLIC KEY'),
  };
}
