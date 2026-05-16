import { loadConfig } from './config.js';
import { createConsumer, createKafkaClient, createProducer } from './kafka.js';
import { startConsumer } from './consumer.js';
import { createEnvelopePublisher } from './envelopePublisher.js';
import { createStatePublisher } from './statePublisher.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const kafka = createKafkaClient(config.kafka);

  const [producer, consumer] = await Promise.all([
    createProducer(kafka),
    createConsumer(kafka, config.kafka.groupId),
  ]);

  const statePublisher = createStatePublisher(producer, config.kafka.stateUpdatesTopic);
  const envelopePublisher = createEnvelopePublisher(producer, config.kafka.emailOutboundTopic);

  const shutdown = async (): Promise<void> => {
    console.log('Shutting down...');
    await Promise.all([consumer.disconnect(), producer.disconnect()]);
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());

  console.log(`Subscribing to ${config.kafka.inputTopic}...`);

  await startConsumer(consumer, config.kafka.inputTopic, {
    statePublisher,
    envelopePublisher,
    notificationSettingsUrl: config.notificationSettingsUrl,
  });
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
