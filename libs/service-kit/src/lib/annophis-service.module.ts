import { Controller, Get, Global, Inject, Injectable, Logger, Module, Req, UseGuards } from '@nestjs/common';
import type { DynamicModule, OnApplicationBootstrap } from '@nestjs/common';

import { EVENTS_OPTIONS, EventBus } from '@annophis/events';
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
 * Wiring every Annophis backend imports once: `AnnophisServiceModule.forRoot()`.
 * The service name defaults to SERVICE_NAME; startup fails without one.
 * Provides the EventBus and /health + /hello. ServiceAuthGuard is opt-in per domain controller
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
        ServiceAuthGuard,
      ],
      exports: [EventBus, ServiceAuthGuard],
    };
  }
}
