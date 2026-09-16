import { useCallback, useMemo, useState } from 'react';
import { Button, CopyButton, ErrorBox, Panel, Select, TextArea, Toolbar } from '@mmoall/tool-kit';
import { algorithmFamily, signJwt, type JwtAlgorithm, type SigningKeyInput } from './jwt-sign';
import { generateDemoKeyPair } from './keygen';
import { computeExpiry, nowSeconds, upsertClaim, type ExpiryUnit } from './claims';

const ALG_OPTIONS: { value: JwtAlgorithm; label: string }[] = [
  { value: 'HS256', label: 'HS256' },
  { value: 'HS384', label: 'HS384' },
  { value: 'HS512', label: 'HS512' },
  { value: 'RS256', label: 'RS256' },
  { value: 'RS384', label: 'RS384' },
  { value: 'RS512', label: 'RS512' },
  { value: 'PS256', label: 'PS256' },
  { value: 'PS384', label: 'PS384' },
  { value: 'PS512', label: 'PS512' },
  { value: 'ES256', label: 'ES256' },
  { value: 'ES384', label: 'ES384' },
];

const EXPIRY_UNIT_OPTIONS: { value: ExpiryUnit; label: string }[] = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
];

const DEFAULT_PAYLOAD = `{
  "sub": "1234567890",
  "name": "John Doe"
}`;

// Small text-input styling to match the shared Select/TextArea primitives in
// @mmoall/tool-kit, since that package intentionally has no generic <Input>.
const textInputClassName =
  'rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]';

export function Tool() {
  const [alg, setAlg] = useState<JwtAlgorithm>('HS256');

  const [secret, setSecret] = useState('');
  const [secretIsBase64, setSecretIsBase64] = useState(false);
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [generatedPublicKeyPem, setGeneratedPublicKeyPem] = useState<string | null>(null);

  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
  const [issValue, setIssValue] = useState('');
  const [subValue, setSubValue] = useState('');
  const [audValue, setAudValue] = useState('');
  const [expiryAmount, setExpiryAmount] = useState(1);
  const [expiryUnit, setExpiryUnit] = useState<ExpiryUnit>('hours');

  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);

  const family = useMemo(() => algorithmFamily(alg), [alg]);
  const usesSecret = family === 'HMAC';

  const addClaim = useCallback((key: string, value: unknown) => {
    setError(null);
    try {
      setPayloadText((current) => upsertClaim(current, key, value));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleAddIss = useCallback(() => {
    if (issValue.trim() === '') return;
    addClaim('iss', issValue);
  }, [addClaim, issValue]);

  const handleAddSub = useCallback(() => {
    if (subValue.trim() === '') return;
    addClaim('sub', subValue);
  }, [addClaim, subValue]);

  const handleAddAud = useCallback(() => {
    if (audValue.trim() === '') return;
    addClaim('aud', audValue);
  }, [addClaim, audValue]);

  const handleAddIat = useCallback(() => addClaim('iat', nowSeconds()), [addClaim]);
  const handleAddNbf = useCallback(() => addClaim('nbf', nowSeconds()), [addClaim]);
  const handleAddJti = useCallback(() => addClaim('jti', crypto.randomUUID()), [addClaim]);
  const handleAddExp = useCallback(
    () => addClaim('exp', computeExpiry(nowSeconds(), expiryAmount, expiryUnit)),
    [addClaim, expiryAmount, expiryUnit],
  );

  const handleGenerateKeyPair = useCallback(async () => {
    setError(null);
    setIsGeneratingKeys(true);
    try {
      const pair = await generateDemoKeyPair(alg);
      setPrivateKeyPem(pair.privateKeyPem);
      setGeneratedPublicKeyPem(pair.publicKeyPem);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingKeys(false);
    }
  }, [alg]);

  const handleSign = useCallback(async () => {
    setError(null);
    setIsSigning(true);
    try {
      const keyInput: SigningKeyInput = usesSecret
        ? { kind: 'secret', secret, isBase64: secretIsBase64 }
        : { kind: 'pem', pem: privateKeyPem };
      const result = await signJwt(alg, {}, payloadText, keyInput);
      setToken(result.token);
    } catch (err) {
      setToken('');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSigning(false);
    }
  }, [alg, payloadText, privateKeyPem, secret, secretIsBase64, usesSecret]);

  const handleClearOutput = useCallback(() => {
    setToken('');
    setError(null);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-[var(--color-accent)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-fg)]">
        🔒 <strong>Tokens never leave your browser.</strong> Signing happens
        entirely client-side using the WebCrypto API — no secret, key, or
        payload is ever sent over the network.
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Header">
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-[var(--color-fg)]">
              Algorithm
              <Select
                aria-label="Signing algorithm"
                value={alg}
                onChange={(event) => setAlg(event.target.value as JwtAlgorithm)}
                options={ALG_OPTIONS}
              />
            </label>

            <p className="text-xs text-[var(--color-muted)]">
              Any secret or private key entered below is used only in your
              browser to sign locally — it is never transmitted anywhere.
            </p>

            {usesSecret ? (
              <>
                <label className="flex flex-col gap-1 text-sm text-[var(--color-fg)]">
                  Secret
                  <input
                    type="text"
                    aria-label="HMAC secret"
                    value={secret}
                    onChange={(event) => setSecret(event.target.value)}
                    placeholder="your-256-bit-secret"
                    className={textInputClassName}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-sm text-[var(--color-fg)]">
                  <input
                    type="checkbox"
                    checked={secretIsBase64}
                    onChange={(event) => setSecretIsBase64(event.target.checked)}
                  />
                  Secret is base64-encoded
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-sm text-[var(--color-fg)]">
                  Private key (PKCS#8 PEM)
                  <TextArea
                    aria-label="Private key PEM"
                    value={privateKeyPem}
                    onChange={(event) => setPrivateKeyPem(event.target.value)}
                    placeholder={'-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'}
                    className="min-h-[140px]"
                  />
                </label>
                <Toolbar>
                  <Button variant="secondary" onClick={handleGenerateKeyPair} disabled={isGeneratingKeys}>
                    {isGeneratingKeys ? 'Generating…' : 'Generate demo key pair'}
                  </Button>
                </Toolbar>
                {generatedPublicKeyPem && (
                  <Panel
                    title="Generated public key (SPKI PEM)"
                    actions={<CopyButton getText={() => generatedPublicKeyPem} />}
                  >
                    <TextArea
                      aria-label="Generated public key PEM"
                      value={generatedPublicKeyPem}
                      readOnly
                      className="min-h-[120px]"
                    />
                  </Panel>
                )}
              </>
            )}
          </div>
        </Panel>

        <Panel title="Payload">
          <div className="flex flex-col gap-3">
            <TextArea
              aria-label="JWT payload JSON"
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              className="min-h-[140px]"
            />

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  aria-label="Issuer (iss) value"
                  value={issValue}
                  onChange={(event) => setIssValue(event.target.value)}
                  placeholder="iss value"
                  className={`w-28 flex-1 py-1 ${textInputClassName}`}
                />
                <Button variant="ghost" onClick={handleAddIss}>
                  + iss
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  aria-label="Subject (sub) value"
                  value={subValue}
                  onChange={(event) => setSubValue(event.target.value)}
                  placeholder="sub value"
                  className={`w-28 flex-1 py-1 ${textInputClassName}`}
                />
                <Button variant="ghost" onClick={handleAddSub}>
                  + sub
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  aria-label="Audience (aud) value"
                  value={audValue}
                  onChange={(event) => setAudValue(event.target.value)}
                  placeholder="aud value"
                  className={`w-28 flex-1 py-1 ${textInputClassName}`}
                />
                <Button variant="ghost" onClick={handleAddAud}>
                  + aud
                </Button>
              </div>

              <Toolbar>
                <Button variant="ghost" onClick={handleAddIat}>
                  + iat (now)
                </Button>
                <Button variant="ghost" onClick={handleAddNbf}>
                  + nbf (now)
                </Button>
                <Button variant="ghost" onClick={handleAddJti}>
                  + jti (random)
                </Button>
              </Toolbar>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={handleAddExp}>
                  + exp (now +)
                </Button>
                <input
                  type="number"
                  aria-label="Expiry amount"
                  min={1}
                  value={expiryAmount}
                  onChange={(event) => setExpiryAmount(Number(event.target.value))}
                  className={`w-16 py-1 ${textInputClassName}`}
                />
                <Select
                  aria-label="Expiry unit"
                  value={expiryUnit}
                  onChange={(event) => setExpiryUnit(event.target.value as ExpiryUnit)}
                  options={EXPIRY_UNIT_OPTIONS}
                />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Toolbar>
        <Button variant="primary" onClick={handleSign} disabled={isSigning}>
          {isSigning ? 'Signing…' : 'Sign JWT'}
        </Button>
        <Button variant="ghost" onClick={handleClearOutput}>
          Clear output
        </Button>
      </Toolbar>

      <Panel title="Signed JWT" actions={<CopyButton getText={() => token} />}>
        <TextArea
          aria-label="Signed JWT output"
          value={token}
          readOnly
          placeholder="Your signed JWT will appear here…"
          className="min-h-[100px]"
        />
      </Panel>
    </div>
  );
}
