import { Controller, Get, Global, Inject, Injectable, Logger, Module, Req, UseGuards } from '@nestjs/common';
import type { DynamicModule, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

import { EVENTS_OPTIONS, EventBus, getOutboxStore, relayOutbox } from '@annophis/events';
import type { EventsOptions } from '@annophis/events';
import { Public, ServiceAuthGuard } from '@annophis/service-auth';
import type { Caller } from '@annophis/service-auth';

// Explicit @Inject everywhere: `pnpm dev` runs tsx (esbuild), which emits no decorator metadata.
@Controller()
@UseGuards(ServiceAuthGuard)
class HealthController {
  constructor(
    @Inject(EventBus) private readonly bus: EventBus,
    @Inject(EVENTS_OPTIONS) private readonly o: EventsOptions,
  ) {}

  @Public()
  @Get('health')
  health() {
    return { service: this.o.service, status: 'ok', bus: this.bus.isConnected() };
  }

  /**
   * Sample guarded domain route: publishes `<service>.hello` (every other service logs it) and echoes who called,
   * i.e. the user from the gateway's internal token or `{ type: 'service' }` for an API key.
   */
  @Get('hello')
  async hello(@Req() req: { caller?: Caller }) {
    await this.bus.publish(`${this.o.service}.hello`, { message: 'hi' });
    return { sent: true, service: this.o.service, caller: req.caller ?? null };
  }
}

@Injectable()
class HelloListener implements OnApplicationBootstrap {
  private readonly log = new Logger('Hello');

  constructor(
    @Inject(EventBus) private readonly bus: EventBus,
    @Inject(EVENTS_OPTIONS) private readonly o: EventsOptions,
  ) {}

  async onApplicationBootstrap() {
    await this.bus.subscribe('*.hello', (e) => this.log.log(`${this.o.service} got ${e.type} from ${e.source}`));
    await this.bus.publish(`${this.o.service}.hello`, { message: 'started' });
  }
}

/**
 * Publishes the service's transactional outbox (rows written by withEntityEvents) to NATS, every
 * OUTBOX_RELAY_INTERVAL_MS (default 500 ms). Rows stay pending while NATS is down and go out once it is back.
 */
@Injectable()
class OutboxRelay implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger('OutboxRelay');
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(@Inject(EventBus) private readonly bus: EventBus) {}

  onApplicationBootstrap() {
    const store = getOutboxStore();
    if (!store) {
      this.log.warn('no outbox: the data source does not use withEntityEvents');
      return;
    }
    const interval = Number(process.env['OUTBOX_RELAY_INTERVAL_MS'] ?? 500);
    this.timer = setInterval(() => void this.tick(store.service, store.client), interval);
  }

  private async tick(service: string, client: { outbox: Parameters<typeof relayOutbox>[1] }) {
    if (this.running) return;
    this.running = true;
    try {
      const { pending } = await relayOutbox(service, client.outbox, (env) => this.bus.publishEnvelope(env));
      if (pending) this.log.warn(`${pending} outbox event(s) not published yet (NATS unavailable?)`);
    } catch (e) {
      this.log.error(e);
    } finally {
      this.running = false;
    }
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }
}

/**
 * Wiring every Annophis backend imports once: `AnnophisServiceModule.forRoot()`.
 * The service name defaults to SERVICE_NAME; startup fails without one.
 * Provides the EventBus, the OutboxRelay and /health + /hello. ServiceAuthGuard is opt-in per domain controller
 * (`@UseGuards(ServiceAuthGuard)`): crouton's own CRUD and `/_app/auth/*` routes use crouton auth instead.
 */
@Global()
@Module({})
export class AnnophisServiceModule {
  static forRoot(opts: Partial<EventsOptions> = {}): DynamicModule {
    const service = opts.service ?? process.env['SERVICE_NAME'];
    if (!service) throw new Error('AnnophisServiceModule: set SERVICE_NAME (or pass { service })');
    const o: EventsOptions = { ...opts, service };
    return {
      module: AnnophisServiceModule,
      controllers: [HealthController],
      providers: [
        { provide: EVENTS_OPTIONS, useValue: o },
        EventBus,
        HelloListener,
        OutboxRelay,
        ServiceAuthGuard,
      ],
      exports: [EventBus, ServiceAuthGuard],
    };
  }
}
