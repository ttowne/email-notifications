# Claude context — email-notifications

## Module system

This project uses `"type": "module"` with `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`. All local imports must use `.js` extensions even though the source files are `.ts` — this is correct NodeNext behaviour. Never change import extensions to `.ts`.

## Test runner

Uses **Vitest**, not Jest. Key commands:

```sh
npx vitest run              # run all tests once
npx vitest run -u           # update snapshots  ← use -u, NOT --update-snapshots
npx vitest run --coverage
```

`--update-snapshots` (camelCase) is silently ignored by Vitest; only `-u` works.

## Wire format

Kafka messages from the Go Search Orchestrator are CBOR-encoded binary (not JSON). `NotificationResultWire` in `types.ts` uses snake_case to match Go field names exactly. `fromWire()` in `consumer.ts` converts to internal camelCase types — always work with the camelCase types inside the service, never the wire types directly.

## 3-strike failure model

- `validateCounts()` in `validator.ts` checks counts against hardcoded thresholds (100/24h, 500/7d, 2000/30d).
- `resolveFailureDecision()` increments the strike count on failure, decrements on success (self-healing).
- At strike 3 the decision includes both `increment_failure` and `disable` state actions, sent simultaneously.
- Strike state is persisted by the Go Scheduler — this service only emits `StateUpdateEvent` events and never reads back the count.

## React Email HTML comments

`react-email`'s `render()` injects `<!-- -->` comment markers between adjacent text nodes in React 19. Tests that check for specific text must strip them:

```ts
const html = raw.replace(/<!--.*?-->/gs, '');
```

This is done in the `renderEmail()` helper in `NotificationEmail.test.tsx`. The stripping is test-only; the comments are harmless in real email clients.

## Email envelope encoding

`envelopePublisher.ts` encodes the envelope with CBOR and then gzip-compresses it. The Kafka message carries a `content-encoding: gzip` header. The downstream Go email delivery service reads that header to know it must decompress before CBOR-decoding.

## Document service

`documentService.ts` is a placeholder stub that returns dummy data. It will be replaced with a Cassandra client call. Do not add caching, retry logic, or connection pooling until the real implementation is in place — the function signature is the stable contract.

## Email template preview

Run `npm run preview:dev` to launch the Next.js preview harness at `http://localhost:3001`. Changes saved through the JSX editor tab are written directly to the source files in `src/emails/` and picked up by Next.js HMR.
