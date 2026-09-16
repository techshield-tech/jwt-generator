// Per-tool metadata. This is the ONE file (together with the `base` in
// vite.config.ts, index.html's <title>/meta tags, README.md, and everything
// under src/tool/) that changes when this template is copied to a sibling
// tool repo.

export type ToolCategory = 'JSON' | 'JWT' | 'SQL' | 'Docker' | 'Git' | 'Web';

export interface ToolConfig {
  /** Unique identifier used in embed postMessage payloads and URLs. */
  slug: string;
  /** Display name shown in the header. */
  name: string;
  /** Short description used for meta tags and listings. */
  description: string;
  /** One of the shared MMOALL tool categories. */
  category: ToolCategory;
  /** Keywords for search/SEO purposes. */
  keywords: string[];
}

export const toolConfig: ToolConfig = {
  slug: 'jwt-generator',
  name: 'JWT Generator',
  description:
    'Build and sign JSON Web Tokens (HS256–HS512, RS256–PS512, ES256/ES384) entirely in your browser using WebCrypto — fast, free, and 100% client-side.',
  category: 'JWT',
  keywords: [
    'jwt generator',
    'jwt encoder',
    'jwt signer',
    'json web token',
    'hs256 jwt',
    'rs256 jwt',
    'es256 jwt',
    'jwt online tool',
  ],
};
