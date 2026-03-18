# Human Crossing

> 설치 없이 브라우저에서 즐기는 3D 멀티플레이 커뮤니티 공간

---

## 프로젝트 소개

Human Crossing은 동물의 숲에서 영감을 받은 **웹 기반 3D 멀티플레이 게임**입니다.
닉네임만 입력하면 바로 3D 월드에 접속하여 다른 유저와 실시간으로 만날 수 있습니다.

### 핵심 기능

- **닉네임 기반 접속** — 회원가입 없이 닉네임만으로 가입/로그인
- **실시간 멀티플레이** — Colyseus 기반 유저 위치 동기화
- **위치 저장** — 접속 종료 시 마지막 위치 저장, 재접속 시 복원
- **플레이어 조회** — 전체 플레이어 목록 및 상세 정보 확인
- **어드민 패널** — KeystoneJS 기반 데이터 관리 GUI
- **API 문서** — Swagger UI 자동 생성

---

## 기술 스택

| 구분            | 기술                        | 버전             |
| --------------- | --------------------------- | ---------------- |
| **Frontend**    | React + Vite + TypeScript   | React 19, Vite 8 |
| **Styling**     | styled-components           | 6.x              |
| **Backend**     | Express + TypeScript        | Express 5        |
| **Game Server** | Colyseus                    | 0.17             |
| **Database**    | PostgreSQL (Docker)         | 16-alpine        |
| **DB Access**   | pg (Raw SQL) / Prisma (ORM) | pg 8 / Prisma 5  |
| **API Docs**    | Swagger (OpenAPI 3.0)       | swagger-jsdoc 6  |
| **Admin**       | KeystoneJS 6                | 6.x              |

---

## 프로젝트 구조

```
human_crossing/
├── frontend/                  # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/               # 백엔드 API 호출 함수
│   │   ├── components/        # React 컴포넌트
│   │   ├── contexts/          # Context + Provider (상태 관리)
│   │   └── types/             # 프론트엔드 타입 정의
│   └── package.json
│
├── backend/                   # Express + Colyseus + TypeScript
│   ├── src/
│   │   ├── config/            # DB 연결, Swagger 설정
│   │   ├── errors/            # 커스텀 에러 클래스
│   │   ├── mappers/           # DB row → DTO 변환
│   │   ├── middlewares/       # 글로벌 에러 핸들러
│   │   ├── rooms/             # Colyseus 게임 룸
│   │   ├── routes/            # API 엔드포인트 + Swagger 주석
│   │   ├── schema/            # 공유 스키마 (Single Source of Truth)
│   │   ├── services/          # 비즈니스 로직
│   │   ├── types/             # DTO 타입 정의
│   │   └── index.ts           # 서버 진입점
│   ├── admin/                 # KeystoneJS 어드민 패널
│   │   ├── keystone.ts
│   │   └── lib/
│   │       └── buildKeystoneList.ts
│   ├── prisma/
│   │   ├── schema.prisma      # DB 스키마 정의
│   │   └── migrations/        # 마이그레이션 SQL
│   └── package.json
│
├── docs/                      # 프로젝트 문서
│   ├── week1-presentation.md  # 1주차 발표 자료
│   └── backend-architecture.md # 백엔드 아키텍처 가이드
│
├── docker-compose.yml         # PostgreSQL 컨테이너
└── README.md
```

---

## 시작하기

### 사전 요구사항

- **Node.js 22+** (백엔드 Colyseus 요구사항)
- **nvm** (Node Version Manager) — 프로젝트별 Node 버전 관리
- **Docker** (PostgreSQL 컨테이너용)
- **yarn**

> ⚠️ **Node 버전 주의**: 백엔드는 **Node.js 22 이상**이 필요합니다.
> `backend/.nvmrc` 파일이 있으므로, 백엔드 폴더에서 `nvm use`를 실행하면 자동으로 올바른 버전으로 전환됩니다.
>
> ```bash
> cd backend
> nvm use        # .nvmrc를 읽어 Node 22로 전환
> node -v        # v22.x.x 확인
> ```

### 1. 저장소 클론

```bash
git clone git@github.com:oz-cupist/human_crossing.git
cd human_crossing
```

### 2. PostgreSQL 실행

```bash
docker compose up -d
```

PostgreSQL이 `localhost:5433`에서 실행됩니다.

### 3. 백엔드 설정

```bash
cd backend
nvm use          # Node 22로 전환 (필수!)
yarn install
```

`.env` 파일 생성:

```env
DATABASE_URL=postgresql://human_crossing:human_crossing@localhost:5433/human_crossing
NODE_ENV=development
PORT=4001
```

DB 마이그레이션:

```bash
npx prisma migrate dev
npx prisma generate
```

백엔드 실행:

```bash
yarn dev
```

서버가 `http://localhost:4001`에서 실행됩니다.

### 4. 프론트엔드 설정

```bash
cd frontend
yarn install
yarn dev
```

프론트엔드가 `http://localhost:4000`에서 실행됩니다.

### 5. (선택) KeystoneJS 어드민 패널

```bash
cd backend/admin
npx keystone dev
```

어드민 패널이 `http://localhost:4002`에서 실행됩니다.

---

## API

### 엔드포인트

| Method | Endpoint            | 설명                    |
| ------ | ------------------- | ----------------------- |
| POST   | `/api/players/join` | 닉네임으로 가입/로그인  |
| GET    | `/api/players`      | 전체 플레이어 목록 조회 |
| GET    | `/api/players/:id`  | 단건 플레이어 조회      |
| GET    | `/health`           | 서버 상태 확인          |

### Swagger UI

```
http://localhost:4001/api-docs
```

모든 API의 요청/응답 형태를 확인하고 직접 테스트할 수 있습니다.

---

## 아키텍처

```
[브라우저] → [Vite Proxy :4000] → [NestJS :4001] → [pg Pool] → [PostgreSQL :5433]
                                        │                              ↑
                                   [Colyseus]                   [KeystoneJS :4002]
                                   (WebSocket)
```

- **NestJS 모듈 구조**: Module → Controller → Service (DI 기반)
- **DTO 패턴**: class-validator + @nestjs/swagger 데코레이터
- **공유 스키마**: `player.schema.ts`를 기반으로 KeystoneJS 어드민 자동 생성
- **글로벌 에러 핸들링**: ExceptionFilter 기반 에러 처리
- **Graceful Shutdown**: NestJS 라이프사이클 (OnModuleDestroy)
- **Raw SQL**: pg Pool을 Global DatabaseModule로 DI

자세한 아키텍처 설명은 [백엔드 아키텍처 가이드](docs/backend-architecture.md)를 참고하세요.

---

## 주요 명령어

```bash
# Docker
docker compose up -d          # PostgreSQL 시작
docker compose down            # 컨테이너 중지
docker compose down -v         # 컨테이너 + 데이터 삭제

# Backend
cd backend
nvm use                        # Node 22로 전환 (필수!)
yarn dev                       # 개발 서버 실행 (nodemon + tsx)
yarn build                     # 프로덕션 빌드 (nest build)
npx prisma migrate dev         # DB 마이그레이션
npx prisma generate            # Prisma 타입 생성

# Frontend
cd frontend
yarn dev                       # 개발 서버 실행
yarn build                     # 프로덕션 빌드

# Admin
cd backend/admin
npx keystone dev               # 어드민 패널 실행
```

---

## 문서

- [1주차 발표 자료](docs/week1-presentation.md) — 환경 셋업 & Create/Read
- [백엔드 아키텍처 가이드](docs/backend-architecture.md) — Prisma, ORM, Swagger, KeystoneJS 상세 설명
