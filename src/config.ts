function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export interface KafkaConfig {
  brokers: string[];
  groupId: string;
  inputTopic: string;
  stateUpdatesTopic: string;
  emailOutboundTopic: string;
}

export interface Config {
  kafka: KafkaConfig;
  /** Base URL prepended to document IDs when building result links for emails. */
  resultLinkBaseUrl: string;
  /** URL linked in warning and disabled email footers for managing notification settings. */
  notificationSettingsUrl: string;
}

/** Loads and validates all required configuration from environment variables. Throws on missing required values. */
export function loadConfig(): Config {
  return {
    kafka: {
      brokers: requireEnv('KAFKA_BROKERS')
        .split(',')
        .map((b) => b.trim()),
      groupId: optionalEnv('KAFKA_GROUP_ID', 'email-notifications'),
      inputTopic: optionalEnv('KAFKA_INPUT_TOPIC', 'search.results.notification'),
      stateUpdatesTopic: optionalEnv('KAFKA_STATE_UPDATES_TOPIC', 'notification.state.updates'),
      emailOutboundTopic: optionalEnv('KAFKA_EMAIL_OUTBOUND_TOPIC', 'email.outbound'),
    },
    resultLinkBaseUrl: requireEnv('RESULT_LINK_BASE_URL'),
    notificationSettingsUrl: requireEnv('NOTIFICATION_SETTINGS_URL'),
  };
}
