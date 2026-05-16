import { encode, decode } from 'cbor-x';

/** Encodes a value to CBOR binary. Used for all Kafka message payloads. */
export function encodeCbor(value: unknown): Buffer {
  return Buffer.from(encode(value));
}

/**
 * Decodes a CBOR binary payload. The generic parameter T is not validated at
 * runtime — callers are responsible for using the correct wire type.
 */
export function decodeCbor<T>(data: Buffer | Uint8Array | null): T {
  if (data === null) {
    throw new Error('Cannot decode null CBOR value');
  }
  return decode(data) as T;
}
