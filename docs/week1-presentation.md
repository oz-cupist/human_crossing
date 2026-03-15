# 1주차: 환경 셋업 & Create / Read

> **프로젝트**: Human Crossing — 브라우저에서 만나는 3D 커뮤니티
> **기술 스택**: React + Vite (프론트) / Express + TypeScript (백엔드) / PostgreSQL 16 (Docker) / Raw SQL (pg)

---

## 프로젝트 구조

```
human_crossing/
├── frontend/          # React + Vite + TypeScript (port 3000)
├── backend/           # Express + Colyseus + TypeScript (port 2567)
│   ├── src/
│   │   ├── config/    # DB 연결 (database.ts)
│   │   ├── services/  # 비즈니스 로직 (player.service.ts)
│   │   ├── routes/    # API 엔드포인트 (player.ts)
│   │   ├── mappers/   # DB row → DTO 변환
│   │   ├── errors/    # 커스텀 에러 클래스
│   │   ├── middlewares/# 글로벌 에러 핸들러
│   │   └── types/     # 공유 타입 정의
│   └── prisma/        # 스키마 정의 (테이블 생성용)
└── docker-compose.yml # PostgreSQL 컨테이너
```

---

# 백엔드

## 1. Docker Compose로 PostgreSQL 띄우기

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: human_crossing_db
    ports:
      - "5433:5432" # 호스트 5433 → 컨테이너 5432
    environment:
      POSTGRES_USER: human_crossing
      POSTGRES_PASSWORD: human_crossing
      POSTGRES_DB: human_crossing
    volumes:
      - pgdata:/var/lib/postgresql/data # 데이터 영속화
```

`docker compose up -d` 한 줄이면 PostgreSQL이 뜹니다.
포트를 5433으로 설정한 이유는, 로컬에 이미 PostgreSQL이 설치되어 있어서 기본 포트(5432)와 충돌을 피하기 위해서입니다.

### 삽질한 것 🔧

> 처음에 5432로 했더니 `Bind for 0.0.0.0:5432 failed: port is already allocated` 에러.
> 호스트 포트만 5433으로 바꾸면 해결되는데, 이때 `DATABASE_URL`도 같이 바꿔야 합니다.

---

## 2. pg 라이브러리로 DB 직접 연결

```typescript
// backend/src/config/database.ts
import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // DATABASE_URL = postgresql://human_crossing:human_crossing@localhost:5433/human_crossing
});

export async function connectDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1"); // 연결 테스트
    console.log("✅ PostgreSQL 연결 성공 (pg)");
  } finally {
    client.release(); // 커넥션 반납 (중요!)
  }
}
```

---

## 3. SQL로 테이블 만들기

Prisma의 마이그레이션 기능으로 테이블을 생성했습니다. 실제로 실행된 SQL은:

```sql
CREATE TABLE players (
    id            TEXT         PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname      TEXT         NOT NULL UNIQUE,
    "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPositionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPositionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPositionZ" DOUBLE PRECISION NOT NULL DEFAULT 0
);
```

### 새로 알게 된 것 💡

> - `gen_random_uuid()`: PostgreSQL 내장 함수로 UUID를 자동 생성
> - `UNIQUE`: 같은 닉네임이 들어오면 DB가 알아서 거부 (에러 코드 23505)
> - `DEFAULT CURRENT_TIMESTAMP`: INSERT할 때 값을 안 넣어도 현재 시간이 자동으로 들어감
> - camelCase 컬럼명에는 큰따옴표(`"joinedAt"`)가 필요 — PostgreSQL은 기본적으로 소문자로 변환하기 때문

---

## 4. POST API — INSERT 쿼리로 데이터 저장

### API: `POST /api/players/join`

닉네임을 받아서 신규 가입 또는 재접속을 처리합니다.

```typescript
// backend/src/services/player.service.ts

async join(nickname: unknown): Promise<JoinResponseDTO> {
  const validated = this.validateNickname(nickname);

  // 1단계: 기존 유저가 있는지 확인 (SELECT)
  const { rows: existing } = await pool.query<PlayerRow>(
    `SELECT * FROM players WHERE nickname = $1`,
    [validated],
  );

  // 2단계: 있으면 로그인 처리 (UPDATE)
  if (existing.length > 0) {
    const { rows } = await pool.query<PlayerRow>(
      `UPDATE players SET "lastLoginAt" = NOW() WHERE id = $1 RETURNING *`,
      [existing[0].id],
    );
    return { message: "다시 오셨군요!", player: toPlayerDTO(rows[0]), isNew: false };
  }

  // 3단계: 없으면 신규 가입 (INSERT)
  const { rows } = await pool.query<PlayerRow>(
    `INSERT INTO players (id, nickname, "joinedAt", "lastLoginAt", "lastPositionX", "lastPositionY", "lastPositionZ")
     VALUES (gen_random_uuid(), $1, NOW(), NOW(), 0, 0, 0)
     RETURNING *`,
    [validated],
  );
  return { message: "환영합니다!", player: toPlayerDTO(rows[0]), isNew: true };
}
```

### 실행 결과

```bash
$ curl -X POST http://localhost:2567/api/players/join \
  -H "Content-Type: application/json" \
  -d '{"nickname":"플레이어1"}'

{
  "message": "환영합니다!",
  "player": {
    "id": "11e5233f-ef1e-40d1-9a36-4f47c441677b",
    "nickname": "플레이어1",
    "joinedAt": "2026-03-15T08:37:14.050Z",
    "lastPosition": { "x": 0, "y": 0, "z": 0 }
  },
  "isNew": true
}
```

### 새로 알게 된 것 💡

> - **Parameterized Query (`$1`)**: SQL Injection을 방지하는 핵심. 유저 입력을 직접 SQL 문자열에 넣지 않고 파라미터로 전달
> - **`RETURNING *`**: INSERT/UPDATE 후 변경된 row를 바로 돌려받을 수 있음. 별도 SELECT가 필요 없음
> - **에러 코드 23505**: PostgreSQL의 unique 제약 위반 코드. race condition으로 동시에 같은 닉네임이 들어올 때를 잡아줌

---

## 5. GET API — SELECT 쿼리로 데이터 조회

### API: `GET /api/players` (목록 조회)

```typescript
async findAll(): Promise<PlayerDTO[]> {
  const { rows } = await pool.query<PlayerRow>(
    `SELECT * FROM players ORDER BY "joinedAt" DESC`,
  );
  return rows.map(toPlayerDTO);
}
```

### API: `GET /api/players/:id` (단건 조회)

```typescript
async findById(id: string): Promise<PlayerDTO> {
  const { rows } = await pool.query<PlayerRow>(
    `SELECT * FROM players WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) {
    throw new AppError(404, "플레이어를 찾을 수 없습니다.");
  }
  return toPlayerDTO(rows[0]);
}
```

### 실행 결과

```bash
$ curl http://localhost:2567/api/players

[
  { "id": "...", "nickname": "플레이어1", "joinedAt": "...", "lastPosition": { "x": 0, "y": 0, "z": 0 } },
  { "id": "...", "nickname": "테스트유저", "joinedAt": "...", "lastPosition": { "x": 0, "y": 0, "z": 0 } }
]
```

---

## 6. 데이터 흐름 이해: HTTP 요청 → DB → 응답

```
[프론트 브라우저]
    │
    │  POST /api/players/join  { nickname: "플레이어1" }
    ▼
[Vite Dev Server :3000]
    │
    │  proxy /api → localhost:2567
    ▼
[Express 서버 :2567]
    │
    │  app.use("/api/players", playerRouter)
    ▼
[Router: player.ts]
    │
    │  router.post("/join", handler)
    ▼
[Service: player.service.ts]
    │
    │  pool.query(`INSERT INTO players ... RETURNING *`, [nickname])
    ▼
[pg Pool → PostgreSQL :5433]
    │
    │  INSERT 실행, row 반환
    ▼
[Mapper: player.mapper.ts]
    │
    │  DB row → { id, nickname, joinedAt, lastPosition } DTO 변환
    ▼
[Express → JSON 응답]
    │
    │  res.status(201).json(result)
    ▼
[프론트 fetch → setState → React 렌더링]
```

---

# 프론트엔드

## 1. 프로젝트 구성

```
frontend/src/
├── api/
│   └── player.ts        # fetch로 백엔드 API 호출
├── types/
│   └── player.ts        # PlayerData, JoinResponse 타입
├── contexts/
│   └── GameContext.tsx   # 게임 상태 관리 (Context + Provider)
├── components/
│   ├── NicknameScreen.tsx  # 등록 화면
│   └── GameScreen.tsx      # 조회 화면 (플레이어 목록)
└── App.tsx              # 라우팅 (닉네임 입력 → 게임 화면)
```

## 2. API 호출 레이어

백엔드와 통신하는 함수들을 한 곳에 모았습니다.

```typescript
// frontend/src/api/player.ts

// 가입/로그인
export async function joinPlayer(nickname: string): Promise<JoinResponse> {
  const response = await fetch(`/api/players/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "서버 에러가 발생했습니다.");
  }
  return response.json();
}

// 전체 조회
export async function getPlayers(): Promise<PlayerData[]> {
  const response = await fetch(`/api/players`);
  if (!response.ok) { ... }
  return response.json();
}
```

### 새로 알게 된 것 💡

> **Vite Proxy**: 프론트(`localhost:3000`)에서 백엔드(`localhost:2567`)로 직접 요청하면 CORS 에러 발생.
> `vite.config.ts`에서 `/api` 경로를 백엔드로 프록시하면, 브라우저 입장에서는 같은 도메인이라 CORS 문제가 없음.

## 3. 상태 관리: Context + Provider 패턴

```typescript
// frontend/src/contexts/GameContext.tsx
export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const join = useCallback(async (nickname: string) => {
    const response = await joinPlayer(nickname);  // API 호출
    setPlayer(response.player);                    // 상태 저장
    setIsGameStarted(true);                        // 화면 전환
  }, []);

  return (
    <GameContext.Provider value={{ player, isGameStarted, join, ... }}>
      {children}
    </GameContext.Provider>
  );
}
```

`useGame()` 훅으로 어디서든 플레이어 정보에 접근할 수 있습니다.

## 4. 등록 화면: NicknameScreen

닉네임을 입력하고 "시작하기"를 누르면 `POST /api/players/join`이 호출됩니다.

```typescript
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  if (nickname.trim() && !isLoading) {
    join(nickname.trim()); // GameContext의 join 호출 → API → setState
  }
};
```

- 입력 검증: 빈 문자열 방지, 20자 제한
- 로딩 상태: 버튼 비활성화 + "접속 중..." 텍스트
- 에러 표시: 서버에서 온 에러 메시지를 화면에 표시

## 5. 조회 화면: GameScreen

가입 후 자동으로 전환되는 화면. `GET /api/players`로 전체 플레이어 목록을 불러옵니다.

```typescript
const fetchPlayers = async () => {
  const data = await getPlayers(); // GET /api/players → SELECT * FROM players
  setPlayers(data);
};

useEffect(() => {
  fetchPlayers(); // 화면 진입 시 자동 조회
}, []);
```

- 내 닉네임에 "나" 뱃지 표시
- 새로고침 버튼으로 목록 갱신
- 가입일 기준 최신순 정렬

---

# 데이터 흐름 전체 그림: DB → 화면

```
[PostgreSQL]
    │
    │  SELECT * FROM players ORDER BY "joinedAt" DESC
    │  → [ { id, nickname, joinedAt, lastPositionX, ... }, ... ]
    ▼
[pg Pool]
    │
    │  rows: PlayerRow[]
    ▼
[Mapper: toPlayerDTO()]
    │
    │  DB 컬럼(lastPositionX/Y/Z) → 프론트 친화적 구조(lastPosition: {x,y,z})
    ▼
[Express]
    │
    │  res.json(players)  →  JSON 배열
    ▼
[fetch → response.json()]
    │
    │  PlayerData[]
    ▼
[React setState]
    │
    │  setPlayers(data)
    ▼
[React 렌더링]
    │
    │  players.map(p => <PlayerItem>...)
    ▼
[사용자 화면] 🎉
```

---

# 정리

## 완료 기준 체크

| #   | 기준                                      | 결과                                     |
| --- | ----------------------------------------- | ---------------------------------------- |
| 1   | `docker compose up`으로 PostgreSQL이 뜬다 | ✅ postgres:16-alpine, port 5433         |
| 2   | 서버가 뜨고 DB 연결이 된다                | ✅ pg Pool로 직접 연결                   |
| 3   | POST API로 데이터가 DB에 들어간다         | ✅ `INSERT INTO players ... RETURNING *` |
| 4   | GET API로 데이터를 조회할 수 있다         | ✅ `SELECT * FROM players` (목록 + 단건) |
| 5   | 프론트에서 등록/조회가 동작한다           | ✅ NicknameScreen + GameScreen           |

## 이번 주에 새로 알게 된 것

1. **Parameterized Query (`$1`)로 SQL Injection을 방지**하는 것이 왜 중요한지. 유저 입력을 절대로 SQL 문자열에 직접 넣으면 안 된다.
2. **`RETURNING *`**을 쓰면 INSERT/UPDATE 후 별도 SELECT 없이 바로 결과를 받을 수 있다. PostgreSQL의 강력한 기능.
3. **Connection Pool의 개념**: 매 요청마다 DB 연결을 새로 만들면 느리기 때문에, Pool에서 빌려 쓰고 반납하는 구조.

## 삽질한 것

1. **Docker 포트 충돌**: 로컬 PostgreSQL과 Docker가 같은 5432를 써서 충돌. 호스트 포트를 5433으로 바꿔서 해결.
2. **camelCase 컬럼명**: PostgreSQL에서 `joinedAt`을 `"joinedAt"`으로 큰따옴표를 감싸야 했음. 안 감싸면 `joinedat`으로 소문자 변환됨.

---

## 부록: API 문서

Swagger UI에서 모든 API를 확인하고 테스트할 수 있습니다.
→ http://localhost:2567/api-docs

| Method | Endpoint            | 설명                   | SQL                                   |
| ------ | ------------------- | ---------------------- | ------------------------------------- |
| POST   | `/api/players/join` | 닉네임으로 가입/로그인 | `INSERT` / `UPDATE`                   |
| GET    | `/api/players`      | 전체 플레이어 조회     | `SELECT * FROM players ORDER BY ...`  |
| GET    | `/api/players/:id`  | 단건 플레이어 조회     | `SELECT * FROM players WHERE id = $1` |
