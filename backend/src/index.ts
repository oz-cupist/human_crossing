import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import swaggerUi from "swagger-ui-express";
// [Prisma 버전] 주석 해제하면 Prisma로 전환
// import { prisma, disconnectPrisma } from "./config/prisma";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { swaggerSpec } from "./config/swagger";
import { errorHandler } from "./middlewares/errorHandler";
import { GameRoom } from "./rooms/GameRoom";
import playerRouter from "./routes/player";

async function main() {
  const app = express();
  const port = Number(process.env.PORT) || 2567;

  app.use(cors());
  app.use(express.json());

  // Swagger API 문서
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => {
    res.json(swaggerSpec);
  });

  // REST API 라우트
  app.use("/api/players", playerRouter);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // 글로벌 에러 핸들러 (라우트 뒤에 등록)
  app.use(errorHandler);

  // [Prisma 버전] 주석 해제하면 Prisma로 전환
  // await prisma.$connect();
  // console.log("✅ PostgreSQL 연결 성공");
  await connectDatabase();

  // HTTP + Colyseus 서버
  const server = http.createServer(app);
  const gameServer = new Server({
    transport: new WebSocketTransport({ server }),
  });

  // Room 등록
  gameServer.define("game", GameRoom);

  gameServer.listen(port);
  console.log(`🚀 서버 실행 중: http://localhost:${port}`);
  console.log(`📄 Swagger: http://localhost:${port}/api-docs`);
  console.log(`🎮 Colyseus 게임 서버 준비 완료`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} 수신, 서버 종료 중...`);
    // [Prisma 버전] await disconnectPrisma();
    await disconnectDatabase();
    server.close(() => {
      console.log("👋 서버 종료 완료");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("서버 시작 실패:", err);
  process.exit(1);
});
