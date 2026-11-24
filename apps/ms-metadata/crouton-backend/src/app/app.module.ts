import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CroutonApiModule } from '@ghentcdh/crouton-api';

import { AnnophisServiceModule } from '@annophis/service-kit';
import { resolve } from 'node:path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    CroutonApiModule.forResourceDir(
      resolve(__dirname, 'resources'),
      resolve(__dirname, 'data-sources'),
      {
        // served to the gateway's single admin UI under /ms-metadata (gateway proxy strips the prefix)
        baseUrl: '/ms-metadata',
      },
    ),
    // after ConfigModule: needs SERVICE_NAME; adds EventBus, /health, /hello (ServiceAuthGuard is opt-in)
    AnnophisServiceModule.forRoot(),
  ],
})
export class AppModule {}
