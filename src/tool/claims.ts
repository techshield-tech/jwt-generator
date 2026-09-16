// Pure helpers for inserting/updating standard JWT claims into the payload
// JSON editor's text content, used by the quick-add claim controls.
// Framework-free. Tool-specific.

export type ExpiryUnit = 'minutes' | 'hours';

const UNIT_SECONDS: Record<ExpiryUnit, number> = {
  minutes: 60,
  hours: 3600,
};

function parsePayloadObject(jsonText: string): Record<string, unknown> {
  const trimmed = jsonText.trim();
  if (trimmed === '') {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new Error(
      `Payload must be valid JSON to add a claim: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Payload must be a JSON object to add a claim.');
  }
  return parsed as Record<string, unknown>;
}

/**
 * Sets `key` to `value` in the payload JSON text (parsing the current text,
 * preserving every other key), and returns the re-serialized, pretty-printed
 * text. Throws if the current text isn't a JSON object.
 */
export function upsertClaim(jsonText: string, key: string, value: unknown): string {
  const payload = parsePayloadObject(jsonText);
  payload[key] = value;
  return JSON.stringify(payload, null, 2);
}

/** Current time as a JWT NumericDate (whole seconds since the Unix epoch). */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Computes `now + amount*unit` as a JWT NumericDate (whole seconds since the epoch). */
export function computeExpiry(nowValue: number, amount: number, unit: ExpiryUnit): number {
  return Math.round(nowValue + amount * UNIT_SECONDS[unit]);
}
