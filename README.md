# email-notifications

Kafka consumer service that processes search result events and delivers HTML email notifications to recipients. Part of a larger notification pipeline alongside a Go Notification Scheduler and Search Orchestrator.

## How it works

1. Subscribes to a Kafka topic receiving CBOR-encoded search result payloads from the Go Search Orchestrator.
2. Decodes each message and validates result counts against configured thresholds.
3. Runs the failure count through a 3-strike model to determine whether to send a normal, warning, or disabled email.
4. Renders a React Email template to HTML.
5. Publishes the email envelope (CBOR + gzip) to `email.outbound` for downstream delivery.
6. Publishes any failure state changes to `notification.state.updates` so the Go Scheduler can update its database.

## Prerequisites

- Node.js 20+
- Kafka cluster reachable at the configured broker addresses

## Setup

```sh
cp .env.example .env
# Fill in KAFKA_BROKERS, RESULT_LINK_BASE_URL, NOTIFICATION_SETTINGS_URL
npm install
```

## Running

```sh
npm run dev      # watch mode (tsx)
npm run build    # compile to dist/
npm start        # run compiled dist/index.js
```

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `KAFKA_BROKERS` | Yes | — | Comma-separated broker addresses, e.g. `broker1:9092,broker2:9092` |
| `KAFKA_GROUP_ID` | No | `email-notifications` | Consumer group ID |
| `KAFKA_INPUT_TOPIC` | No | `search.results.notification` | Topic to consume from |
| `KAFKA_STATE_UPDATES_TOPIC` | No | `notification.state.updates` | Topic for failure state updates |
| `KAFKA_EMAIL_OUTBOUND_TOPIC` | No | `email.outbound` | Topic for rendered email envelopes |
| `RESULT_LINK_BASE_URL` | Yes | — | Base URL prepended to document IDs for result links |
| `NOTIFICATION_SETTINGS_URL` | Yes | — | URL for the notification settings page linked in warning/disabled emails |

## Testing

```sh
npm test                # run all tests once
npm run test:watch      # watch mode
npm run test:update     # update snapshots (vitest -u)
npm run test:coverage   # run with coverage report (80% threshold enforced)
```

## Code quality

```sh
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run format      # Prettier
```

## Email template development

A live preview harness lives at `preview/`. It renders the email template in a browser with editable props, raw JSON editing, and in-browser JSX source editing with save-and-verify.

```sh
npm run preview:dev    # installs preview deps then starts at http://localhost:3001
```

See [`preview/README.md`](preview/README.md) for full feature documentation.

## Project structure

```
src/
  index.ts                    Entry point — wires up Kafka clients, starts consumer
  config.ts                   Environment variable loading and validation
  types.ts                    All type definitions: wire (snake_case from Go),
                                internal (camelCase), and output types
  cbor.ts                     CBOR encode/decode utilities (wraps cbor-x)
  kafka.ts                    Kafka client/producer/consumer factory functions
  consumer.ts                 Message processing pipeline
  validator.ts                Result count validation and 3-strike failure logic
  documentService.ts          Document detail resolver (stub — Cassandra pending)
  emailBuilder.tsx            React Email renderer wrapper
  envelopePublisher.ts        Publishes email envelopes to Kafka (CBOR + gzip)
  statePublisher.ts           Publishes failure state change events to Kafka
  emails/
    NotificationEmail.tsx     Root email template component
    components/
      ResultsSummary.tsx      Hit count summary and View Results CTA
      CountsTable.tsx         24h / 7d / 30d result count stat boxes
      DocumentLinks.tsx       Numbered list of most relevant document links
      WarningBanner.tsx       Yellow strike warning shown on failures 1–2 of 3
      DisabledNotice.tsx      Red notice shown when notification is disabled
preview/                      Next.js live preview tool (see preview/README.md)
```
