import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { AppModule } from './app.module';
import { GameRoom } from './game/game.room';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 2567;

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Human Crossing API')
    .setDescription('Human Crossing 게임 서버 API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // HTTP 서버 가져오기
  await app.init();
  const httpServer = app.getHttpServer();

  // Colyseus 게임 서버 설정
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define('game', GameRoom);

  await app.listen(port);
  console.log(`🚀 NestJS 서버 실행 중: http://localhost:${port}`);
  console.log(`📄 Swagger: http://localhost:${port}/api-docs`);
  console.log(`🎮 Colyseus 게임 서버 준비 완료`);
}

bootstrap();
