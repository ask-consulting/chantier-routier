import { NotificationChannel, NotificationRecipient } from '../notification.types';

/** One rendered message, ready to leave. */
export interface OutgoingMessage {
  recipient: NotificationRecipient;
  /** Null on channels that carry no subject line. */
  subjectLine: string | null;
  body: string;
}

/**
 * One transport. `EMAIL` today; `SMS` has a template and no sender, which is
 * exactly the state the schema describes.
 *
 * The port is what makes the provider a one-file decision: today a sender that
 * writes to the log, tomorrow one that calls an API, and the day the module
 * becomes its own service, neither the use case nor identity notices.
 */
export interface ChannelSenderPort {
  readonly channel: NotificationChannel;
  send(message: OutgoingMessage): Promise<void>;
}

export const CHANNEL_SENDERS = Symbol('ChannelSenders');
