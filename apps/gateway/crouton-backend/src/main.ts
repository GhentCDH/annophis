import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';

import { applyResourceTagDescriptions } from '@ghentcdh/crouton-api';

import { AppModule } from './app/app.module';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // Server-side Keycloak login (crouton → passport-openidconnect) keeps the OAuth `state` in req.session and
  // fails with a bare 500 without it. Only used during the login redirect; the login result is a crouton JWT.
  // ponytail: in-memory store, fine for one gateway instance; use a shared store (e.g. Postgres) when scaled out.
  app.use(
    session({
      secret: process.env.CROUTON_AUTH_SECRET ?? '',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Annophis')
    .setVersion('0.0.1')
    .build();
  const document = await applyResourceTagDescriptions(
    app,
    SwaggerModule.createDocument(app, config),
  );
  SwaggerModule.setup('docs', app, document);

  const port = process.env.BACKEND_PORT || process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Application running on http://localhost:${port}`);
};

bootstrap();
