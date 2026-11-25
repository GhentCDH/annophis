import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CroutonApiModule } from '@ghentcdh/crouton-api';

import { InternalAdminGuard } from '@annophis/service-auth';
import { AnnophisServiceModule } from '@annophis/service-kit';
import { resolve } from 'node:path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    CroutonApiModule.forResourceDir(
      resolve(__dirname, 'resources'),
      resolve(__dirname, 'data-sources'),
      {
        // served to the gateway's single admin UI under /ms-corpora (gateway proxy strips the prefix)
        baseUrl: '/ms-corpora',
        // crouton CRUD is admin-only; the gateway's X-Internal-Token replaces the old keycloak auth-provider
        security: {
          default: { guard: 'admin' },
          guards: { admin: InternalAdminGuard },
        },
      },
    ),
    // after ConfigModule: needs SERVICE_NAME; adds EventBus, /health, /hello (ServiceAuthGuard is opt-in)
    AnnophisServiceModule.forRoot(),
  ],
})
export class AppModule {}
