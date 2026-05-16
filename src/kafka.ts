import { Kafka, type Producer, type Consumer } from 'kafkajs';
import type { KafkaConfig } from './config.js';

export function createKafkaClient(config: KafkaConfig): Kafka {
  return new Kafka({
    clientId: 'email-notifications',
    brokers: config.brokers,
  });
}

/**
 * Creates and connects a Kafka producer.
 *
 * `idempotent: true` enables exactly-once delivery semantics at the producer
 * level — Kafka deduplicates retried sends using sequence numbers. Combined
 * with `maxInFlightRequests: 5`, this is the maximum allowed by the idempotent
 * producer spec while still preserving ordering within a partition.
 */
export async function createProducer(kafka: Kafka): Promise<Producer> {
  const producer = kafka.producer({
    idempotent: true,
    maxInFlightRequests: 5,
  });
  await producer.connect();
  return producer;
}

export async function createConsumer(kafka: Kafka, groupId: string): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  return consumer;
}
