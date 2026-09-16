# JWT Generator

Build and sign JSON Web Tokens entirely in your browser using WebCrypto (`crypto.subtle`) — fast, free, and 100% client-side. Tokens never leave your browser; nothing you enter is ever sent over the network.

**Live:** https://techshield-tech.github.io/jwt-generator/

Part of [MMOALL Developer Tools](https://mmoall.com/tools).
Also available at [mmoall.com/tools/jwt-generator](https://mmoall.com/tools/jwt-generator).

## Features

- Sign with HS256/HS384/HS512, RS256/RS384/RS512, PS256/PS384/PS512, or
  ES256/ES384 — all via the browser's native WebCrypto API, no JWT or crypto
  library dependency.
- HS\*: paste a secret directly, or toggle "secret is base64-encoded" to sign
  with the decoded raw bytes.
- RS\*/PS\*/ES\*: paste a PKCS#8 private key PEM (ES256 requires a P-256 key,
  ES384 requires a P-384 key).
- One-click demo key pair generation (RSA 2048 for RS\*/PS\*, EC P-256/P-384
  for ES256/ES384) with copyable PKCS#8 private / SPKI public PEM output —
  the private key auto-fills the signing field.
- JSON payload editor with quick-add buttons for standard claims: `iss`,
  `sub`, `aud`, `iat` (now), `exp` (now + N minutes/hours), `nbf`, and `jti`
  (random UUID via `crypto.randomUUID()`).
- Copy the signed compact JWT to clipboard.
- Clear warning that secrets/keys are used only locally and never
  transmitted, and a visible privacy note: tokens never leave your browser.
- Responsive down to 360px viewport width.

## Embedding

This tool can be embedded in an iframe, e.g. on mmoall.com. In embed mode it
renders only the tool itself (no header/footer) on a transparent background.

```html
<iframe
  id="jwt-generator"
  src="https://techshield-tech.github.io/jwt-generator/?embed=1&theme=dark"
  style="width: 100%; border: 0;"
  title="JWT Generator"
></iframe>

<script>
  const iframe = document.getElementById('jwt-generator');

  // Resize the iframe to fit its content.
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.type === 'mmoall-tool:height' && data.slug === 'jwt-generator') {
      iframe.style.height = `${data.height}px`;
    }
    if (data && data.type === 'mmoall-tool:ready' && data.slug === 'jwt-generator') {
      // The tool has mounted and is ready.
    }
  });

  // Push a theme change into the iframe (only accepted from an allowed origin).
  iframe.contentWindow.postMessage({ type: 'mmoall-tool:theme', theme: 'dark' }, '*');
</script>
```

### Contract

- `?embed=1` in the URL renders only the tool (no chrome), transparent
  background.
- `?theme=light` / `?theme=dark` sets the initial theme; otherwise it follows
  `prefers-color-scheme`.
- The page listens for `window.postMessage({type:'mmoall-tool:theme', theme})`
  from the parent frame to change theme at runtime. Only messages whose
  `event.origin` is `https://mmoall.com`, `https://www.mmoall.com`, or
  `http://localhost:3000` are accepted.
- On mount (embed mode only), the page posts
  `{type:'mmoall-tool:ready', slug:'jwt-generator'}` to `window.parent`.
- Whenever its rendered height changes (embed mode only), the page posts
  `{type:'mmoall-tool:height', slug:'jwt-generator', height}` to
  `window.parent`.

## Local development

```bash
bun install
bun dev
```

Build for production:

```bash
bun run build
```

Deployment to GitHub Pages happens automatically via
`.github/workflows/deploy.yml` on every push to `main`.

## License

MIT — see [LICENSE](./LICENSE).
