import type { Producer } from 'kafkajs';
import { encodeCbor } from './cbor.js';
import type { StateAction, StateUpdateEvent } from './types.js';

export interface StatePublisher {
  publish(configId: number, action: StateAction): Promise<void>;
}

/**
 * Creates a publisher for failure state update events. The Go Scheduler
 * consumes these to update `last_run_at`, `failure_count`, and `enabled`
 * on the `notification_configs` table. The event uses snake_case to match
 * the Go consumer's expected field names.
 */
export function createStatePublisher(producer: Producer, topic: string): StatePublisher {
  return {
    async publish(configId: number, action: StateAction): Promise<void> {
      const event: StateUpdateEvent = {
        notification_config_id: configId,
        action,
        timestamp_ms: Date.now(),
      };
      await producer.send({
        topic,
        messages: [{ value: encodeCbor(event) }],
      });
    },
  };
}
