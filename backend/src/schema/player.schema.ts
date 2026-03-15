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
  lastPositionX: {
    type: "float" as const,
    default: 0,
    label: "위치 X",
  },
  lastPositionY: {
    type: "float" as const,
    default: 0,
    label: "위치 Y",
  },
  lastPositionZ: {
    type: "float" as const,
    default: 0,
    label: "위치 Z",
  },
} as const;

export type PlayerFieldName = keyof typeof PLAYER_FIELDS;
