# Human Crossing 백엔드 아키텍처 가이드

> 이 문서는 **주니어 개발자**가 백엔드 코드를 읽고 "왜 이렇게 구성했는지"를 이해할 수 있도록,
> 시니어 개발자의 관점에서 작성한 기술 문서입니다.

---

# 목차

1. [전체 그림: 우리 백엔드는 어떻게 생겼나](#1-전체-그림)
2. [데이터베이스 세팅: PostgreSQL + Docker](#2-데이터베이스-세팅)
3. [Raw SQL이란 무엇인가: pg 라이브러리](#3-raw-sql)
4. [ORM이란 무엇인가](#4-orm이란)
5. [Prisma 완전 정복](#5-prisma-완전-정복)
6. [Raw SQL vs Prisma: 같은 기능, 다른 코드](#6-raw-sql-vs-prisma)
7. [Swagger: API 문서 자동화](#7-swagger)
8. [KeystoneJS: 어드민 패널](#8-keystonejs)
9. [공유 스키마: Single Source of Truth](#9-공유-스키마)
10. [Prisma + Swagger + Keystone 삼위일체의 장점](#10-삼위일체)
11. [서비스 레이어 아키텍처](#11-서비스-레이어)
12. [DTO와 Mapper 패턴](#12-dto와-mapper)
13. [글로벌 에러 핸들링](#13-에러-핸들링)
14. [Graceful Shutdown](#14-graceful-shutdown)
15. [실전 팁과 FAQ](#15-실전-팁)

---

# 1. 전체 그림

먼저 전체 구조를 머릿속에 그려봅시다.

```
                           ┌─────────────────────────────────┐
                           │         프론트엔드 (React)        │
                           │         localhost:3000           │
                           └──────────────┬──────────────────┘
                                          │ fetch("/api/...")
                                          │ (Vite Proxy)
                                          ▼
                           ┌─────────────────────────────────┐
                           │      Express 서버 (백엔드)        │
                           │      localhost:2567              │
                           │                                  │
                           │  ┌───────────┐  ┌────────────┐  │
                           │  │  Routes    │  │  Swagger   │  │
                           │  │  (API)     │  │  /api-docs │  │
                           │  └─────┬─────┘  └────────────┘  │
                           │        │                         │
                           │  ┌─────▼─────┐                   │
                           │  │  Service   │                   │
                           │  │  Layer     │                   │
                           │  └─────┬─────┘                   │
                           │        │                         │
                           │  ┌─────▼─────┐                   │
                           │  │  pg Pool   │ ← Raw SQL 실행    │
                           │  │  (또는     │                   │
                           │  │  Prisma)   │ ← ORM 실행        │
                           │  └─────┬─────┘                   │
                           └────────┼─────────────────────────┘
                                    │
                                    ▼
                           ┌─────────────────────────────────┐
                           │   PostgreSQL 16 (Docker)         │
                           │   localhost:5433                 │
                           └─────────────────────────────────┘
                                    ▲
                                    │
                           ┌────────┴─────────────────────────┐
                           │   KeystoneJS 어드민 패널           │
                           │   localhost:4000                  │
                           │   (같은 DB를 바라봄)               │
                           └──────────────────────────────────┘
```

### 핵심 포인트

- **하나의 PostgreSQL DB**를 Express 백엔드와 KeystoneJS 어드민이 **공유**합니다.
- Express에서는 **pg 라이브러리(Raw SQL)** 또는 **Prisma(ORM)**로 DB에 접근합니다.
- Swagger는 API 문서를 **자동으로 생성**해서 프론트엔드 개발자가 API를 쉽게 파악합니다.
- KeystoneJS는 운영팀이 데이터를 **GUI로 관리**할 수 있는 어드민 패널입니다.

### 왜 이런 구조인가?

실무에서는 이런 질문들이 매일 나옵니다:

- **"이 API 뭐 보내야 하지?"** → Swagger가 답해줍니다
- **"DB에 이상한 데이터가 있는데, 직접 봐야 해"** → KeystoneJS 어드민에서 봅니다
- **"테이블 구조 바꿔야 하는데, 실수 없이 하고 싶어"** → Prisma Migration이 해줍니다
- **"SQL 공부를 해야 하는데"** → Raw SQL로 직접 쿼리를 씁니다

이 모든 요구를 **하나의 프로젝트 안에서** 해결하는 것이 이 구조의 목표입니다.

---

# 2. 데이터베이스 세팅

## 2.1 왜 Docker인가?

"내 컴퓨터에 PostgreSQL 설치하면 안 되나요?"

설치해도 됩니다. 하지만 이런 문제가 생깁니다:

| 상황 | PostgreSQL 직접 설치 | Docker |
| --- | --- | --- |
| 팀원이 다른 버전을 설치함 | 버그 원인 찾기 어려움 | `postgres:16-alpine`으로 버전 고정 |
| 로컬 DB에 다른 프로젝트 데이터가 섞임 | 테이블명 충돌 위험 | 프로젝트별 컨테이너 분리 |
| 맥/윈도우/리눅스 설치법이 다름 | 각자 다르게 설치 | `docker compose up` 한 줄이면 끝 |
| DB를 싹 밀고 다시 시작하고 싶음 | 복잡한 클린업 필요 | `docker compose down -v` 하면 끝 |

Docker는 **"환경을 코드로 정의한다"**는 철학입니다.

## 2.2 docker-compose.yml 해부

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine          # 1) 이미지
    container_name: human_crossing_db  # 2) 컨테이너 이름
    restart: unless-stopped            # 3) 재시작 정책
    ports:
      - "5433:5432"                    # 4) 포트 매핑
    environment:
      POSTGRES_USER: human_crossing    # 5) DB 유저
      POSTGRES_PASSWORD: human_crossing
      POSTGRES_DB: human_crossing
    volumes:
      - pgdata:/var/lib/postgresql/data # 6) 데이터 영속화

volumes:
  pgdata:
```

### 1) `image: postgres:16-alpine`

- `postgres`: Docker Hub에 올라가 있는 공식 PostgreSQL 이미지
- `16`: PostgreSQL 16 버전
- `alpine`: 가장 가벼운 Alpine 기반 (약 80MB)

### 2) `container_name`

이름을 붙여두면 `docker exec -it human_crossing_db psql ...` 같은 명령이 편해집니다.

### 3) `restart: unless-stopped`

컴퓨터를 재부팅해도 자동으로 다시 띄워줍니다.
`docker stop`으로 명시적으로 멈춘 경우에만 재시작 안 합니다.

### 4) `ports: "5433:5432"`

```
호스트(내 맥)의 5433 포트  →  컨테이너 안의 5432 포트
```

로컬에 이미 PostgreSQL이 있으면 충돌하므로 호스트 포트를 5433으로 바꿨습니다.

> **자주 하는 실수**: DATABASE_URL에서 포트를 5432로 적어놓고 "연결이 안 된다"고 하는 경우.
> 호스트 포트(5433)와 DATABASE_URL의 포트가 일치해야 합니다.

### 5) `environment`

컨테이너 시작 시 자동으로 유저/비밀번호/데이터베이스를 생성합니다.
별도로 `CREATE DATABASE`를 할 필요가 없습니다.

### 6) `volumes`

Docker 컨테이너는 기본적으로 일회용입니다.
`volumes`를 쓰면 데이터가 호스트에 저장되어 컨테이너를 재생성해도 데이터가 유지됩니다.

```bash
# 컨테이너만 재생성 (데이터 유지)
docker compose down && docker compose up -d

# 데이터까지 완전 삭제
docker compose down -v
```

## 2.3 DATABASE_URL 구조

```
postgresql://human_crossing:human_crossing@localhost:5433/human_crossing
             └── user ─────┘└── password ──┘└── host ──┘└port┘└── db ──┘
```

이 URL 하나로 Prisma, pg, KeystoneJS 모두 같은 DB에 접속합니다.

---

# 3. Raw SQL

## 3.1 Raw SQL이란?

SQL 쿼리를 **문자열 그대로** 작성해서 DB에 보내는 방식입니다.

```typescript
const result = await pool.query(
  `SELECT * FROM players WHERE nickname = $1`,
  ["플레이어1"],
);
```

ORM 없이, 프레임워크 없이, DB가 이해하는 언어를 **직접** 말하는 것입니다.

## 3.2 pg 라이브러리와 Connection Pool

`pg`는 Node.js에서 PostgreSQL에 접속하기 위한 **가장 기본적인** 라이브러리입니다.

### Connection Pool이란?

DB 연결은 TCP 소켓을 열고, 인증하고, 세션을 만드는 과정을 거칩니다.
이건 **수십 밀리초**가 걸립니다.

API 요청마다 새로 만들면:

```
요청 1: 연결 생성(30ms) → 쿼리(5ms) → 해제 → 총 35ms
요청 2: 연결 생성(30ms) → 쿼리(5ms) → 해제 → 총 35ms
```

Pool을 쓰면:

```
서버 시작 시: 연결 10개 미리 생성
요청 1: Pool에서 빌림(0ms) → 쿼리(5ms) → 반납 → 총 5ms
요청 2: Pool에서 빌림(0ms) → 쿼리(5ms) → 반납 → 총 5ms
```

**6배 이상 빨라집니다.**

### 우리 프로젝트의 Pool 설정

```typescript
// backend/src/config/database.ts
import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function connectDatabase(): Promise<void> {
  const client = await pool.connect();  // Pool에서 하나 빌림
  try {
    await client.query("SELECT 1");     // 연결 테스트
    console.log("✅ PostgreSQL 연결 성공 (pg)");
  } finally {
    client.release();                   // 반드시 반납!
  }
}

export async function disconnectDatabase(): Promise<void> {
  await pool.end();                     // 서버 종료 시 Pool 정리
}
```

> **주의**: `client.release()`를 빠뜨리면 Pool이 고갈됩니다.
> 기본 최대 연결 수는 10개인데, 다 빌려놓고 반납 안 하면
> 11번째 요청부터 **영원히 대기**합니다.
> `finally`에 넣는 이유: 에러가 나도 반납을 보장하기 위해.

## 3.3 Parameterized Query: SQL Injection 방지

### 위험한 코드 (절대 이렇게 하지 마세요)

```typescript
// ❌ 위험!!! SQL Injection 가능
const query = `SELECT * FROM players WHERE nickname = '${nickname}'`;
```

`nickname`에 `'; DROP TABLE players; --`가 들어오면:

```sql
SELECT * FROM players WHERE nickname = ''; DROP TABLE players; --'
```

**테이블이 삭제됩니다.**

### 안전한 코드

```typescript
// ✅ 안전! $1은 파라미터 자리표시자
await pool.query(`SELECT * FROM players WHERE nickname = $1`, ["플레이어1"]);
```

`$1`에 들어가는 값은 문자열 리터럴로 처리됩니다.
SQL 구조를 바꿀 수 없으므로 안전합니다.

### 파라미터 번호 규칙

```typescript
// $1 = 첫 번째, $2 = 두 번째, ...
await pool.query(
  `UPDATE players SET "lastPositionX" = $2, "lastPositionY" = $3 WHERE nickname = $1`,
  [nickname, x, y],  // $1=nickname, $2=x, $3=y
);
```

## 3.4 RETURNING 절

PostgreSQL의 강력한 기능입니다.

```sql
-- 일반: 2번 쿼리
INSERT INTO players (...) VALUES (...);
SELECT * FROM players WHERE nickname = '플레이어1';

-- RETURNING: 1번이면 됨
INSERT INTO players (...) VALUES (...) RETURNING *;
```

INSERT/UPDATE/DELETE 후 영향받은 row를 **즉시 반환**합니다.

> **참고**: `RETURNING`은 PostgreSQL 전용 기능. MySQL에는 없습니다.

---

# 4. ORM이란

## 4.1 정의

ORM은 **Object-Relational Mapping**의 약자입니다.

> **DB 테이블의 row를 → 프로그래밍 언어의 객체(Object)로 변환해주는 도구**

### Raw SQL의 세계

```typescript
const { rows } = await pool.query(`SELECT * FROM players WHERE id = $1`, [id]);
// rows[0].nickName (오타)이라고 써도 TS가 못 잡음
```

### ORM의 세계

```typescript
const player = await prisma.player.findUnique({ where: { id } });
// player.nickName ← TS 컴파일 에러! "nickname"이라고 해야 함
```

## 4.2 ORM이 해결하는 4가지 문제

### 문제 1: 타입 안전성이 없다

```typescript
// Raw SQL — 타입을 수동으로 정의
interface PlayerRow {
  id: string;
  nickname: string;
  // ... 컬럼 추가할 때마다 수동 업데이트
}

// Prisma — 타입이 자동으로 생성됨
import { Player } from "@prisma/client";
// 컬럼을 추가하면 타입도 자동으로 바뀜
```

### 문제 2: SQL 오타를 잡을 수 없다

```typescript
// Raw SQL — 런타임에야 발견
await pool.query(`SELCT * FROM plaeyrs`); // TS: "문자열이니 OK" 😅

// Prisma — 컴파일 타임에 발견
await prisma.plaeyrs.findMany(); // TS: 빨간줄! ❌
```

### 문제 3: DB별 SQL 문법이 다르다

```sql
-- PostgreSQL: LIMIT 10 OFFSET 20
-- MySQL:      LIMIT 20, 10 (순서 반대!)
-- SQL Server: SELECT TOP 10 (아예 다른 문법)
```

```typescript
// ORM: 어떤 DB든 같은 코드
await prisma.player.findMany({ skip: 20, take: 10 });
```

### 문제 4: 반복 코드가 많다

```typescript
// Raw SQL — 매번 모든 컬럼 나열
await pool.query(
  `INSERT INTO players (id, nickname, "joinedAt", "lastLoginAt", "lastPositionX", "lastPositionY", "lastPositionZ")
   VALUES (gen_random_uuid(), $1, NOW(), NOW(), 0, 0, 0) RETURNING *`,
  [nickname],
);

// Prisma — 필요한 것만
await prisma.player.create({ data: { nickname } });
```

## 4.3 ORM의 단점

| 단점 | 설명 |
| --- | --- |
| **학습 비용** | ORM API를 별도로 배워야 함 |
| **복잡한 쿼리** | JOIN 3개 이상, 서브쿼리 등은 ORM으로 표현하기 어려움 |
| **성능 오버헤드** | SQL 생성 과정에서 약간의 오버헤드 |
| **SQL을 모르게 됨** | ORM에만 의존하면 DB 원리를 모르게 됨 |
| **디버깅 어려움** | 생성된 SQL이 예상과 다를 때 원인 찾기 어려움 |

> **시니어의 조언**: Raw SQL을 먼저 배우고, 그 다음에 ORM을 쓰세요.
> ORM이 뒤에서 뭘 하는지 이해하고 써야 문제가 생겼을 때 해결할 수 있습니다.
> 이것이 우리 프로젝트에서 Raw SQL과 Prisma를 **둘 다** 구현해놓은 이유입니다.

---

# 5. Prisma 완전 정복

## 5.1 Prisma란?

Prisma는 **차세대 Node.js/TypeScript ORM**입니다.

| 기존 ORM (Sequelize 등) | Prisma |
| --- | --- |
| JS/TS로 모델 정의 | `.prisma` 파일(자체 DSL)로 스키마 정의 |
| 런타임에 타입 생성 | **빌드 타임에 타입 생성** (더 안전) |
| 클래스 기반 | 함수 기반 (더 직관적) |
| 쿼리 빌더 스타일 | 객체 스타일 API |

## 5.2 Prisma의 3가지 핵심 구성요소

### 1) Prisma Schema

DB 구조를 선언적으로 정의하는 파일입니다.

```prisma
// backend/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Player {
  id            String   @id @default(uuid())
  nickname      String   @unique
  joinedAt      DateTime @default(now())
  lastLoginAt   DateTime @default(now())
  lastPositionX Float    @default(0)
  lastPositionY Float    @default(0)
  lastPositionZ Float    @default(0)

  @@map("players")  // 실제 테이블명
}
```

이 파일 하나에서 **3가지가 결정**됩니다:
1. DB 테이블 구조
2. TypeScript 타입
3. 마이그레이션 SQL

### 2) Prisma Client (쿼리 실행)

`npx prisma generate`를 실행하면 TypeScript 타입이 자동 생성됩니다.

```typescript
// 자동 생성됨
export type Player = {
  id: string
  nickname: string
  joinedAt: Date
  lastLoginAt: Date
  lastPositionX: number
  lastPositionY: number
  lastPositionZ: number
}
```

```typescript
// 자동완성 지원!
const players = await prisma.player.findMany({
  orderBy: { joinedAt: "desc" },
});
// players 타입: Player[] — 자동!
```

### 3) Prisma Migrate (DB 버전 관리)

```bash
npx prisma migrate dev --name add_email_field
```

자동으로 SQL 생성:

```sql
-- prisma/migrations/20260315074838_init/migration.sql
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPositionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPositionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPositionZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "players_nickname_key" ON "players"("nickname");
```

이 SQL은 **Git에 커밋**됩니다. 팀원이 pull 받고 `npx prisma migrate dev`를 실행하면
자동으로 같은 DB 구조가 됩니다.

## 5.3 Prisma 설정 파일

```typescript
// backend/src/config/prisma.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]  // 개발: SQL 쿼리 로그
      : ["warn", "error"],          // 프로덕션: 경고/에러만
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  console.log("🔌 Prisma 연결 해제");
}
```

> **시니어의 조언**: 개발 환경에서는 항상 `log: ["query"]`를 켜두세요.
> Prisma가 비효율적인 쿼리를 만들 수 있고, 로그를 봐야 발견합니다.

## 5.4 Prisma의 내부 동작 원리

```
prisma.player.findUnique({ where: { nickname: "플레이어1" } })
  ↓ Prisma Client (TypeScript)
  ↓ Query Engine (Rust로 작성된 바이너리)
  ↓ SQL 생성:
     SELECT "players"."id", "players"."nickname", ...
     FROM "players" WHERE "players"."nickname" = $1
  ↓ PostgreSQL에 전송
  ↓ 결과를 Player 타입 객체로 변환
  ↓ 반환
```

핵심: Prisma의 Query Engine은 **Rust로 작성**되어 있어 빠릅니다.

---

# 6. Raw SQL vs Prisma

우리 프로젝트에서는 같은 기능을 두 가지로 구현했습니다.
주석만 전환하면 Raw SQL ↔ Prisma를 오갈 수 있습니다.

## 6.1 SELECT: 목록 조회

```typescript
// ──── Raw SQL ────
async findAll(): Promise<PlayerDTO[]> {
  const { rows } = await pool.query<PlayerRow>(
    `SELECT * FROM players ORDER BY "joinedAt" DESC`,
  );
  return rows.map(toPlayerDTO);
}

// ──── Prisma ────
async findAll(): Promise<PlayerDTO[]> {
  const players = await prisma.player.findMany({ orderBy: { joinedAt: "desc" } });
  return players.map(toPlayerDTO);
}
```

## 6.2 INSERT: 데이터 생성

```typescript
// ──── Raw SQL ────
const { rows } = await pool.query<PlayerRow>(
  `INSERT INTO players (id, nickname, "joinedAt", "lastLoginAt", "lastPositionX", "lastPositionY", "lastPositionZ")
   VALUES (gen_random_uuid(), $1, NOW(), NOW(), 0, 0, 0) RETURNING *`,
  [validated],
);

// ──── Prisma ────
const player = await prisma.player.create({ data: { nickname: validated } });
```

Prisma는 `nickname`만 넣으면 나머지는 `@default`가 처리합니다.

## 6.3 에러 처리: unique 위반

```typescript
// ──── Raw SQL ────
if (error.code === "23505") { ... }  // PostgreSQL 에러 코드 외워야 함

// ──── Prisma ────
if (error.code === "P2002") { ... }  // Prisma 에러 코드 (DB 무관)
```

## 6.4 어떤 걸 써야 할까?

| 상황 | 추천 |
| --- | --- |
| SQL을 배우는 중 | Raw SQL |
| 빠르게 CRUD를 만들 때 | Prisma |
| 복잡한 쿼리 (JOIN 3개+) | Raw SQL |
| 팀 프로젝트 일관성 | Prisma |
| 극한 성능 최적화 | Raw SQL |

---

# 7. Swagger

## 7.1 Swagger란?

Swagger(OpenAPI)는 **REST API의 스펙을 정의하는 표준**입니다.

### Swagger가 없으면

```
프론트: "플레이어 가입 API 어떻게 써?"
백엔드: "POST /api/players/join 에 nickname 보내면 됨"
프론트: "response 형태가 뭐야?"
백엔드: "아 잠깐만... (코드 열어서 보는 중)"
```

### Swagger가 있으면

```
프론트: http://localhost:2567/api-docs 접속
→ 모든 API의 URL, 요청/응답 형태, 에러 코드가 한 눈에 보임
→ "Try it out" 버튼으로 바로 테스트도 가능
```

## 7.2 설정

```typescript
// backend/src/config/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Human Crossing API",
      version: "1.0.0",
      description: "Human Crossing 게임 서버 REST API 문서",
    },
    servers: [{ url: "http://localhost:2567", description: "로컬 개발 서버" }],
  },
  apis: ["./src/routes/*.ts"],  // JSDoc 주석이 있는 파일
};

export const swaggerSpec = swaggerJsdoc(options);
```

```typescript
// backend/src/index.ts
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
```

## 7.3 라우트에 JSDoc으로 API 정의

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     Player:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         nickname:
 *           type: string
 *         joinedAt:
 *           type: string
 *           format: date-time
 *         lastPosition:
 *           $ref: '#/components/schemas/Position'
 */

/**
 * @swagger
 * /api/players:
 *   get:
 *     summary: 플레이어 목록 조회
 *     tags: [Players]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Player'
 */
```

Schema를 한 번 정의하면 `$ref`로 여러 곳에서 재사용합니다.

> **Swagger의 진짜 가치**: API가 10개, 20개가 되면 문서 없이는 개발이 불가능합니다.
> "코드가 곧 문서"가 되게 해줍니다.

---

# 8. KeystoneJS

## 8.1 KeystoneJS란?

**DB 데이터를 GUI로 관리할 수 있는 어드민 패널**입니다.

### 어드민 패널이 없으면

```bash
docker exec -it human_crossing_db psql -U human_crossing
SELECT * FROM players;
# SQL을 알아야 하고, WHERE 빼먹으면 전체 데이터 변경
```

### 어드민 패널이 있으면

```
http://localhost:4000 접속
→ 플레이어 목록이 표로 보임
→ 클릭해서 편집 가능
→ 비개발자도 사용 가능
```

## 8.2 설정

```typescript
// backend/admin/keystone.ts
import { config } from "@keystone-6/core";
import { buildKeystoneList } from "./lib/buildKeystoneList";
import { PLAYER_TABLE, PLAYER_FIELDS } from "../src/schema/player.schema";

export default config({
  db: {
    provider: "postgresql",
    url: process.env.DATABASE_URL ||
      "postgresql://human_crossing:human_crossing@localhost:5433/human_crossing",
    enableLogging: true,
  },
  server: { port: 4000 },
  lists: {
    Player: buildKeystoneList(PLAYER_TABLE, PLAYER_FIELDS),
  },
});
```

### 핵심: 같은 DB를 바라본다

```
Express 백엔드 (port 2567) ──→ PostgreSQL ←── KeystoneJS 어드민 (port 4000)
```

백엔드 API로 생성한 데이터를 어드민에서 바로 확인 가능합니다.

## 8.3 buildKeystoneList: 스키마 자동 변환

KeystoneJS는 자체 필드 정의 문법을 가지고 있습니다.
공유 스키마를 KeystoneJS 형식으로 자동 변환하는 함수를 만들었습니다.

```typescript
// backend/admin/lib/buildKeystoneList.ts
export function buildKeystoneList(tableName: string, fields: Record<string, FieldDef>) {
  const keystoneFields: Record<string, any> = {};

  for (const [name, def] of Object.entries(fields)) {
    switch (def.type) {
      case "string":
        keystoneFields[name] = text({
          validation: { isRequired: def.required ?? false },
          ...(def.unique ? { isIndexed: "unique" as const } : {}),
        });
        break;
      case "timestamp":
        keystoneFields[name] = timestamp({
          ...(def.defaultNow ? { defaultValue: { kind: "now" as const } } : {}),
          db: { map: name },
        });
        break;
      case "float":
        keystoneFields[name] = float({
          defaultValue: def.default ?? 0,
          db: { map: name },
        });
        break;
    }
  }

  return list({
    access: allowAll,
    db: { map: tableName },
    fields: keystoneFields,
  });
}
```

---

# 9. 공유 스키마

## 9.1 문제: 스키마가 여러 곳에 분산

Player 모델이 정의되는 곳이 **원래 3곳**이었습니다:

```
1. Prisma:     prisma/schema.prisma
2. KeystoneJS: admin/keystone.ts
3. TypeScript: src/types/player.ts
```

필드 하나를 추가하면 3곳을 모두 수정해야 했습니다. 하나라도 빠뜨리면:

- Prisma에만 추가 → 어드민에서 안 보임
- KeystoneJS에만 추가 → DB에 컬럼이 없어서 에러
- TS 타입에 안 추가 → API 응답에서 빠짐

## 9.2 해결: 공유 스키마 파일

```typescript
// backend/src/schema/player.schema.ts

/**
 * Player 모델의 Single Source of Truth.
 * 백엔드 서비스, DTO, KeystoneJS 어드민 모두 이 정의를 기반으로 동작합니다.
 *
 * 필드를 추가/변경하면:
 * 1. 여기서 수정
 * 2. prisma/schema.prisma 에도 반영
 * 3. npx prisma migrate dev --name <name>
 * → KeystoneJS 어드민은 자동 반영됨
 */

export const PLAYER_TABLE = "players";

export const PLAYER_FIELDS = {
  nickname: {
    type: "string" as const,
    required: true,
    unique: true,
    maxLength: 20,
    label: "닉네임",
  },
  joinedAt: {
    type: "timestamp" as const,
    defaultNow: true,
    label: "가입일",
  },
  lastLoginAt: {
    type: "timestamp" as const,
    defaultNow: true,
    label: "마지막 로그인",
  },
  lastPositionX: { type: "float" as const, default: 0, label: "위치 X" },
  lastPositionY: { type: "float" as const, default: 0, label: "위치 Y" },
  lastPositionZ: { type: "float" as const, default: 0, label: "위치 Z" },
} as const;
```

### 필드 추가 시 워크플로우

```
1. player.schema.ts에 email 추가 → KeystoneJS 자동 반영
2. prisma/schema.prisma에 email 추가 → npx prisma migrate dev
3. types/player.ts (DTO)에 email 추가
4. mapper에서 email 매핑 추가
```

---

# 10. 삼위일체

## 10.1 각자의 역할

```
┌─────────────────────────────────────────────────────┐
│                  하나의 PostgreSQL DB                 │
│                                                      │
│  ┌─────────┐    ┌──────────┐    ┌───────────────┐   │
│  │ Prisma   │    │ Swagger  │    │ KeystoneJS    │   │
│  │          │    │          │    │               │   │
│  │ DB 구조  │    │ API 문서 │    │ 데이터 관리   │   │
│  │ + 타입   │    │ 자동화   │    │ GUI           │   │
│  └─────────┘    └──────────┘    └───────────────┘   │
│       │              │                │              │
│       ▼              ▼                ▼              │
│  TypeScript     Swagger UI       어드민 패널         │
│  타입 안전성    API 테스트        데이터 CRUD         │
└─────────────────────────────────────────────────────┘
```

## 10.2 장점 1: 진실의 원천이 하나

모든 도구가 같은 DB를 바라봅니다.

```
API로 플레이어를 생성하면
  → KeystoneJS 어드민에서 바로 보임
  → Swagger에서 GET으로 바로 조회 가능
```

## 10.3 장점 2: 개발 속도

- **Prisma 없다면**: SQL 직접 작성 + 타입 수동 정의 + 마이그레이션 수동 관리
- **Swagger 없다면**: Notion에 문서 따로 작성 → 코드 바뀌면 문서가 안 맞음
- **KeystoneJS 없다면**: 어드민 화면을 직접 만들어야 함 (수일 소요)

세 가지 조합하면 **테이블 하나 추가하는 데 1시간**이면 됩니다.

## 10.4 장점 3: 협업

| 역할 | 사용하는 도구 |
| --- | --- |
| 백엔드 개발자 | Prisma + Service 코드 |
| 프론트 개발자 | Swagger UI (API 확인 + 테스트) |
| 기획자/운영팀 | KeystoneJS 어드민 (데이터 확인/수정) |
| QA | Swagger + KeystoneJS |

## 10.5 장점 4: 디버깅

```
1. Swagger에서 API 직접 호출 → 응답 확인
2. KeystoneJS에서 DB 데이터 직접 확인
3. Prisma 로그로 실행된 SQL 확인
```

## 10.6 장점 5: 타입 공유로 인한 안정성

```
Prisma Schema
  ↓ npx prisma generate
TypeScript 타입 자동 생성 (Player)
  ↓ import
Service에서 사용
  ↓ toPlayerDTO()
API 응답 (PlayerDTO)
  ↓ Swagger로 문서화
프론트에서 같은 타입으로 사용 (PlayerData)
```

전 구간에서 타입이 연결되어 있으므로,
테이블 구조가 바뀌면 컴파일 에러로 **즉시 알 수 있습니다**.

---

# 11. 서비스 레이어

## 11.1 왜 필요한가?

라우트에 비즈니스 로직을 직접 넣으면:

```typescript
// ❌ 라우트에 모든 것이 섞임
router.post("/join", async (req, res) => {
  // 유효성 검사 + DB 조회 + 분기 처리 + DB 삽입 + 에러 처리
  // → 한 함수가 80줄
  // → 테스트 불가
  // → Colyseus GameRoom에서 재사용 불가
});
```

## 11.2 분리 후

```typescript
// Service: 비즈니스 로직만
export class PlayerService {
  async join(nickname: unknown): Promise<JoinResponseDTO> { ... }
  async findAll(): Promise<PlayerDTO[]> { ... }
  async findById(id: string): Promise<PlayerDTO> { ... }
  async updatePosition(...): Promise<void> { ... }
  async getLastPosition(nickname: string) { ... }
  private validateNickname(nickname: unknown): string { ... }
}
```

```typescript
// Route: HTTP 요청/응답만
router.post("/join", async (req, res, next) => {
  try {
    const result = await playerService.join(req.body.nickname);
    res.status(result.isNew ? 201 : 200).json(result);
  } catch (err) {
    next(err);
  }
});
```

### Colyseus GameRoom에서도 재사용

```typescript
// backend/src/rooms/GameRoom.ts
import { playerService } from "../services/player.service";

export class GameRoom extends Room<GameState> {
  async onJoin(client: Client, options: { nickname: string }) {
    const lastPos = await playerService.getLastPosition(options.nickname);
    player.x = lastPos.x;
    player.y = lastPos.y;
    player.z = lastPos.z;
  }

  async onLeave(client: Client) {
    await playerService.updatePosition(player.nickname, player.x, player.y, player.z);
  }
}
```

Express Route와 Colyseus GameRoom이 **같은 Service를 공유**합니다.

---

# 12. DTO와 Mapper

## 12.1 DTO란?

DTO = **Data Transfer Object**. 데이터를 전달하기 위한 객체입니다.

### DB 모델을 그대로 보내면 안 되는 이유

DB `players` 테이블:

```json
{
  "id": "abc",
  "nickname": "플레이어1",
  "joinedAt": "2026-03-15T08:00:00.000Z",
  "lastLoginAt": "2026-03-15T09:30:00.000Z",  // ← 내부 정보 노출
  "lastPositionX": 10.5,
  "lastPositionY": 0,
  "lastPositionZ": -3.2
  // ← X/Y/Z가 평평하게 나와서 프론트에서 쓰기 불편
}
```

### DTO로 변환하면

```json
{
  "id": "abc",
  "nickname": "플레이어1",
  "joinedAt": "2026-03-15T08:00:00.000Z",
  "lastPosition": { "x": 10.5, "y": 0, "z": -3.2 }
}
```

- `lastLoginAt` 제거 → 불필요한 정보 노출 방지
- `X/Y/Z` → `{ x, y, z }` 구조화 → 프론트에서 편함
- DB 구조 변경 시 DTO만 유지하면 프론트 수정 불필요

## 12.2 DTO 정의

```typescript
// backend/src/types/player.ts
export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface PlayerDTO {
  id: string;
  nickname: string;
  joinedAt: string;        // Date가 아닌 string (JSON에는 Date 타입이 없음)
  lastPosition: Position;
}

export interface JoinResponseDTO {
  message: string;
  player: PlayerDTO;
  isNew: boolean;
}
```

## 12.3 Mapper 함수

```typescript
// backend/src/mappers/player.mapper.ts
export interface PlayerRow {
  id: string;
  nickname: string;
  joinedAt: Date | string;
  lastLoginAt: Date | string;
  lastPositionX: number;
  lastPositionY: number;
  lastPositionZ: number;
}

export function toPlayerDTO(row: PlayerRow): PlayerDTO {
  return {
    id: row.id,
    nickname: row.nickname,
    joinedAt:
      row.joinedAt instanceof Date ? row.joinedAt.toISOString() : row.joinedAt,
    lastPosition: {
      x: row.lastPositionX,
      y: row.lastPositionY,
      z: row.lastPositionZ,
    },
  };
}
```

`PlayerRow`는 Raw SQL 결과와 Prisma 결과 **모두 호환**되도록 설계했습니다.
`joinedAt`이 `Date`(Prisma)이든 `string`(Raw SQL)이든 모두 처리합니다.

---

# 13. 에러 핸들링

## 13.1 문제: 모든 라우트에서 try-catch 반복

```typescript
// ❌ 모든 라우트에서 에러 처리 반복
router.post("/join", async (req, res) => {
  try { ... }
  catch (error) {
    if (error.code === "23505") res.status(409).json({ error: "..." });
    else res.status(500).json({ error: "서버 에러" });
  }
});

router.get("/", async (req, res) => {
  try { ... }
  catch (error) {
    res.status(500).json({ error: "서버 에러" });  // 복붙
  }
});
```

## 13.2 해결: 커스텀 에러 클래스 + 글로벌 핸들러

### 커스텀 에러 클래스

```typescript
// backend/src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) { super(400, message); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(409, message); }
}
```

### 글로벌 에러 핸들러

```typescript
// backend/src/middlewares/errorHandler.ts
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "서버 에러가 발생했습니다." });
}
```

### 사용법

```typescript
// Service에서 에러를 throw
throw new BadRequestError("닉네임을 입력해주세요.");  // → 400
throw new ConflictError("이미 사용 중인 닉네임입니다."); // → 409
throw new AppError(404, "플레이어를 찾을 수 없습니다."); // → 404

// Route에서는 next(err)로 위임
router.get("/:id", async (req, res, next) => {
  try {
    const player = await playerService.findById(req.params.id as string);
    res.json(player);
  } catch (err) {
    next(err);  // → errorHandler가 자동으로 처리
  }
});
```

`try-catch`에서 하는 일은 **오직 `next(err)` 호출뿐**입니다.
에러의 종류에 따른 응답 분기는 **글로벌 핸들러 한 곳**에서 관리합니다.

---

# 14. Graceful Shutdown

## 14.1 왜 필요한가?

서버를 종료할 때 `Ctrl+C`를 누르면 프로세스가 즉시 죽습니다.
이때 처리 중이던 요청이 있으면:

- DB 커넥션이 정리 안 됨 → Pool 누수
- 진행 중이던 트랜잭션이 롤백되지 않음
- 클라이언트가 응답을 못 받음

## 14.2 구현

```typescript
// backend/src/index.ts
const shutdown = async (signal: string) => {
  console.log(`\n${signal} 수신, 서버 종료 중...`);

  // 1. DB 연결 정리
  await disconnectDatabase();  // pg Pool 정리
  // Prisma 버전: await disconnectPrisma();

  // 2. HTTP 서버 종료 (진행 중인 요청 완료 후)
  server.close(() => {
    console.log("👋 서버 종료 완료");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));   // Ctrl+C
process.on("SIGTERM", () => shutdown("SIGTERM"));  // Docker stop, kill
```

순서가 중요합니다:
1. **DB 연결 먼저 정리** (새로운 쿼리 방지)
2. **HTTP 서버 종료** (진행 중인 요청은 완료 후 종료)

---

# 15. 실전 팁

## FAQ

### Q: Prisma와 Raw SQL 중 뭘 써야 하나요?

프로젝트 초기에는 Prisma로 빠르게 만들고,
성능 이슈가 생기거나 복잡한 쿼리가 필요할 때 Raw SQL을 쓰세요.
우리 프로젝트처럼 둘 다 구현해놓고 전환 가능하게 하는 것도 좋은 방법입니다.

### Q: KeystoneJS 대신 다른 어드민 도구를 써도 되나요?

됩니다. AdminJS, Retool 등 선택지가 많습니다.
KeystoneJS를 선택한 이유는 **같은 DB를 공유**하면서 별도 설정 없이 CRUD가 되기 때문입니다.

### Q: Swagger 주석이 너무 길어요. 더 짧게 할 수 없나요?

NestJS를 쓰면 데코레이터로 더 깔끔하게 작성할 수 있습니다.
Express에서는 `swagger-jsdoc`이 가장 일반적인 방법입니다.
주석이 길어지는 건 어쩔 수 없지만, API 문서가 자동으로 생성되는 것의 가치가 더 큽니다.

### Q: Service를 왜 class로 만들었나요? 함수로 하면 안 되나요?

함수로도 됩니다. class로 만든 이유는:
1. 관련 메서드를 하나로 묶기 편함
2. 나중에 DI(의존성 주입)를 도입할 때 유리
3. private 메서드(`validateNickname`)를 캡슐화할 수 있음

### Q: DTO를 왜 따로 만들어요? DB 모델 그대로 보내면 안 되나요?

안 됩니다. 이유:
1. **보안**: `lastLoginAt` 같은 내부 정보가 노출됨
2. **구조**: `lastPositionX/Y/Z` → `lastPosition: {x,y,z}`로 구조화
3. **안정성**: DB 구조가 바뀌어도 DTO만 유지하면 프론트 코드 수정 불필요

### Q: Connection Pool을 안 쓰면 안 되나요?

쓸 수는 있지만 성능이 나빠집니다.
매 요청마다 DB 연결을 새로 만드는 비용은 수십 ms입니다.
동시 사용자가 100명만 되어도 서버가 버벅거립니다.

## 디렉토리 구조 요약

```
backend/
├── admin/
│   ├── keystone.ts              # KeystoneJS 설정
│   └── lib/
│       └── buildKeystoneList.ts # 공유 스키마 → KeystoneJS 변환
├── prisma/
│   ├── schema.prisma            # DB 스키마 정의
│   └── migrations/              # 자동 생성된 SQL
├── src/
│   ├── config/
│   │   ├── database.ts          # pg Pool (Raw SQL)
│   │   ├── prisma.ts            # Prisma Client (ORM)
│   │   └── swagger.ts           # Swagger 설정
│   ├── errors/
│   │   └── AppError.ts          # 커스텀 에러 클래스
│   ├── mappers/
│   │   └── player.mapper.ts     # DB row → DTO 변환
│   ├── middlewares/
│   │   └── errorHandler.ts      # 글로벌 에러 핸들러
│   ├── routes/
│   │   └── player.ts            # API 엔드포인트 + Swagger 주석
│   ├── schema/
│   │   └── player.schema.ts     # 공유 스키마 (Single Source of Truth)
│   ├── services/
│   │   └── player.service.ts    # 비즈니스 로직 (Raw SQL + Prisma 주석)
│   ├── types/
│   │   └── player.ts            # DTO 타입 정의
│   ├── rooms/
│   │   └── GameRoom.ts          # Colyseus 게임 룸
│   └── index.ts                 # 서버 진입점
└── package.json
```

## 핵심 명령어

```bash
# DB 시작
docker compose up -d

# Prisma 마이그레이션
cd backend && npx prisma migrate dev --name <name>

# Prisma 타입 생성
npx prisma generate

# 백엔드 서버 시작 (dev)
cd backend && npx tsx src/index.ts

# KeystoneJS 어드민 시작
cd backend/admin && npx keystone dev

# API 문서
open http://localhost:2567/api-docs

# 어드민 패널
open http://localhost:4000
```

---

> **마지막으로**: 이 문서에서 설명한 패턴들은 "정답"이 아닙니다.
> 프로젝트의 규모, 팀의 숙련도, 요구사항에 따라 최적의 구조는 달라집니다.
> 중요한 것은 **"왜 이렇게 했는지"를 설명할 수 있는 것**입니다.
> 구조를 만든 이유를 이해하면, 다른 프로젝트에서도 적절한 판단을 내릴 수 있습니다.
