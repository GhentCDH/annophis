import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AckPolicy, jetstream, jetstreamManager } from '@nats-io/jetstream';
import type { JetStreamClient, JetStreamManager } from '@nats-io/jetstream';
import { connect } from '@nats-io/transport-node';
import type { NatsConnection } from '@nats-io/transport-node';
import { randomUUID } from 'node:crypto';


export const EVENTS_OPTIONS = Symbol('EVENTS_OPTIONS');
export type EventsOptions = { service: string; servers?: string };

/** All Annophis events live in one JetStream stream on subjects `annophis.<type>`. */
export const STREAM = 'ANNOPHIS';

export type EventEnvelope<T = unknown> = {
  id: string;
  type: string;
  source: string;
  time: string;
  subject?: string;
  dataVersion: string;
  data: T;
};

@Injectable()
export class EventBus implements OnModuleInit, OnModuleDestroy {
  private nc?: NatsConnection;
  private js!: JetStreamClient;
  private jsm!: JetStreamManager;
  private readonly log = new Logger(EventBus.name);

  constructor(@Inject(EVENTS_OPTIONS) private readonly opts: EventsOptions) {}

  async onModuleInit() {
    this.nc = await connect({ servers: this.opts.servers ?? process.env['NATS_URL'] });
    this.jsm = await jetstreamManager(this.nc);
    await this.jsm.streams
      .info(STREAM)
      .catch(() => this.jsm.streams.add({ name: STREAM, subjects: ['annophis.>'] }));
    this.js = jetstream(this.nc);
  }

  isConnected = () => !!this.nc && !this.nc.isClosed();

  /** Publishes `data` as event `type` (subject `annophis.<type>`); the event id doubles as JetStream dedupe id. */
  publish = async <T>(type: string, data: T, subject?: string) => {
    const env: EventEnvelope<T> = {
      id: randomUUID(),
      type,
      source: this.opts.service,
      time: new Date().toISOString(),
      subject,
      dataVersion: '1',
      data,
    };
    await this.publishEnvelope(env);
    return env;
  };

  /** Publishes a ready-made envelope (e.g. from the outbox): same id → JetStream drops duplicates (msgID). */
  publishEnvelope = async (env: EventEnvelope) => {
    await this.js.publish(`annophis.${env.type}`, JSON.stringify(env), { msgID: env.id });
  };

  /**
   * Durable, per-service subscription. `filter` is a subject pattern below `annophis.` (e.g. `*.hello`).
   * Handlers must be idempotent: a failing handler NAKs and the message is redelivered.
   */
  subscribe = async (filter: string, handler: (event: EventEnvelope) => Promise<void> | void) => {
    const durable = `${this.opts.service}--${filter.replace(/[.*>]/g, '_')}`;
    await this.jsm.consumers.add(STREAM, {
      durable_name: durable,
      filter_subject: `annophis.${filter}`,
      ack_policy: AckPolicy.Explicit,
    });
    const consumer = await this.js.consumers.get(STREAM, durable);
    const messages = await consumer.consume();
    void (async () => {
      for await (const m of messages) {
        try {
          await handler(m.json<EventEnvelope>());
          m.ack();
        } catch (e) {
          this.log.error(e);
          m.nak();
        }
      }
    })();
  };

  async onModuleDestroy() {
    await this.nc?.drain();
  }
}
