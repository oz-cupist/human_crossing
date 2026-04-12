import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Players API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testNickname = `t_${Date.now() % 100000}`;
  const testPin = "1234";
  let playerId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.player.deleteMany({
      where: { nickname: { startsWith: "t_" } },
    });
    await app.close();
  });

  describe("POST /api/players/join", () => {
    it("신규 가입 성공", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/players/join")
        .send({ nickname: testNickname, pin: testPin })
        .expect(200);

      expect(res.body.message).toBe("환영합니다!");
      expect(res.body.isNew).toBe(true);
      expect(res.body.player.nickname).toBe(testNickname);
      expect(res.body.player.id).toBeDefined();

      playerId = res.body.player.id;
    });

    it("같은 닉네임 + 올바른 PIN으로 재로그인", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/players/join")
        .send({ nickname: testNickname, pin: testPin })
        .expect(200);

      expect(res.body.message).toBe("다시 오셨군요!");
      expect(res.body.isNew).toBe(false);
    });

    it("같은 닉네임 + 틀린 PIN → 401", async () => {
      await request(app.getHttpServer())
        .post("/api/players/join")
        .send({ nickname: testNickname, pin: "9999" })
        .expect(401);
    });

    it("빈 닉네임 → 400", async () => {
      await request(app.getHttpServer())
        .post("/api/players/join")
        .send({ nickname: "", pin: "1234" })
        .expect(400);
    });

    it("잘못된 PIN 형식 → 400", async () => {
      await request(app.getHttpServer())
        .post("/api/players/join")
        .send({ nickname: "someone", pin: "ab" })
        .expect(400);
    });
  });

  describe("GET /api/players", () => {
    it("플레이어 목록 조회", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/players")
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /api/players/:id", () => {
    it("단건 조회 성공", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/players/${playerId}`)
        .expect(200);

      expect(res.body.nickname).toBe(testNickname);
    });

    it("존재하지 않는 ID → 404", async () => {
      await request(app.getHttpServer())
        .get("/api/players/00000000-0000-0000-0000-000000000000")
        .expect(404);
    });
  });

  describe("PATCH /api/players/:id", () => {
    const newNickname = `tu_${Date.now() % 100000}`;

    it("닉네임 변경 성공", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/players/${playerId}`)
        .send({ nickname: newNickname })
        .expect(200);

      expect(res.body.nickname).toBe(newNickname);
    });

    it("존재하지 않는 ID → 404", async () => {
      await request(app.getHttpServer())
        .patch("/api/players/00000000-0000-0000-0000-000000000000")
        .send({ nickname: "ghost" })
        .expect(404);
    });
  });

  describe("DELETE /api/players/:id", () => {
    it("플레이어 삭제 성공", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/players/${playerId}`)
        .expect(200);

      expect(res.body.message).toBe("플레이어가 삭제되었습니다.");
    });

    it("이미 삭제된 플레이어 → 404", async () => {
      await request(app.getHttpServer())
        .delete(`/api/players/${playerId}`)
        .expect(404);
    });
  });
});
