import { Controller, Get, Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import type { DynamicModule, OnApplicationBootstrap } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { EVENTS_OPTIONS, EventBus } from '@annophis/events';
import type { EventsOptions } from '@annophis/events';
import { Public, ServiceAuthGuard } from '@annophis/service-auth';

@Controller()
class HealthController {
  constructor(
    private readonly bus: EventBus,
    @Inject(EVENTS_OPTIONS) private readonly o: EventsOptions,
  ) {}

  @Public()
  @Get('health')
  health() {
    return { service: this.o.service, status: 'ok', bus: this.bus.isConnected() };
  }

  /** Phase 0 smoke test: publishes `<service>.hello`; every other service logs it. */
  @Get('hello')
  async hello() {
    await this.bus.publish(`${this.o.service}.hello`, { message: 'hi' });
    return { sent: true };
  }
}

@Injectable()
class HelloListener implements OnApplicationBootstrap {
  private readonly log = new Logger('Hello');

  constructor(
    private readonly bus: EventBus,
    @Inject(EVENTS_OPTIONS) private readonly o: EventsOptions,
  ) {}

  async onApplicationBootstrap() {
    await this.bus.subscribe('*.hello', (e) => this.log.log(`${this.o.service} got ${e.type} from ${e.source}`));
    await this.bus.publish(`${this.o.service}.hello`, { message: 'started' });
  }
}

/**
 * Wiring every Annophis backend imports once:
 * `AnnophisServiceModule.forRoot({ service: process.env.SERVICE_NAME! })`.
 * Provides the EventBus, /health and /hello, and ServiceAuthGuard as global guard.
 */
@Global()
@Module({})
export class AnnophisServiceModule {
  static forRoot(o: EventsOptions): DynamicModule {
    return {
      module: AnnophisServiceModule,
      controllers: [HealthController],
      providers: [
        { provide: EVENTS_OPTIONS, useValue: o },
        EventBus,
        HelloListener,
        { provide: APP_GUARD, useClass: ServiceAuthGuard },
      ],
      exports: [EventBus],
    };
  }
}
