import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Guestbook API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authorId: string;
  let otherPlayerId: string;
  let entryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // 테스트용 플레이어 2명 생성
    const author = await request(app.getHttpServer())
      .post("/api/players/join")
      .send({ nickname: `ga_${Date.now() % 100000}`, pin: "1234" });
    authorId = author.body.player.id;

    const other = await request(app.getHttpServer())
      .post("/api/players/join")
      .send({ nickname: `go_${Date.now() % 100000}`, pin: "5678" });
    otherPlayerId = other.body.player.id;
  });

  afterAll(async () => {
    // 테스트 데이터 정리: 방명록 먼저, 플레이어 후
    const ids = [authorId, otherPlayerId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.guestbook.deleteMany({
        where: { authorId: { in: ids } },
      });
    }
    await prisma.player.deleteMany({
      where: { nickname: { startsWith: "g" } },
    });
    await app.close();
  });

  describe("POST /api/guestbook", () => {
    it("방명록 작성 성공", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/guestbook")
        .send({ authorId, content: "테스트 방명록입니다" })
        .expect(201);

      expect(res.body.content).toBe("테스트 방명록입니다");
      expect(res.body.authorId).toBe(authorId);
      expect(res.body.authorNickname).toBeDefined();

      entryId = res.body.id;
    });

    it("빈 내용 → 400", async () => {
      await request(app.getHttpServer())
        .post("/api/guestbook")
        .send({ authorId, content: "" })
        .expect(400);
    });
  });

  describe("GET /api/guestbook", () => {
    it("방명록 목록 조회", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/guestbook")
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const entry = res.body.find((e: any) => e.id === entryId);
      expect(entry).toBeDefined();
      expect(entry.authorNickname).toBeDefined();
    });
  });

  describe("PATCH /api/guestbook/:id", () => {
    it("본인 방명록 수정 성공", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/guestbook/${entryId}`)
        .send({ authorId, content: "수정된 내용" })
        .expect(200);

      expect(res.body.content).toBe("수정된 내용");
    });

    it("다른 사람의 방명록 수정 → 403", async () => {
      await request(app.getHttpServer())
        .patch(`/api/guestbook/${entryId}`)
        .send({ authorId: otherPlayerId, content: "해킹 시도" })
        .expect(403);
    });

    it("존재하지 않는 방명록 수정 → 404", async () => {
      await request(app.getHttpServer())
        .patch("/api/guestbook/00000000-0000-0000-0000-000000000000")
        .send({ authorId, content: "유령" })
        .expect(404);
    });
  });

  describe("DELETE /api/guestbook/:id", () => {
    it("다른 사람의 방명록 삭제 → 403", async () => {
      await request(app.getHttpServer())
        .delete(`/api/guestbook/${entryId}?authorId=${otherPlayerId}`)
        .expect(403);
    });

    it("본인 방명록 삭제 성공", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/guestbook/${entryId}?authorId=${authorId}`)
        .expect(200);

      expect(res.body.message).toBe("방명록이 삭제되었습니다.");
    });

    it("이미 삭제된 방명록 → 404", async () => {
      await request(app.getHttpServer())
        .delete(`/api/guestbook/${entryId}?authorId=${authorId}`)
        .expect(404);
    });
  });
});
