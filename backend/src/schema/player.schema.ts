export const PLAYER_TABLE = "players";

export const PLAYER_FIELDS = {
  nickname: {
    type: "string" as const,
    required: true,
    unique: true,
    maxLength: 50,
    label: "닉네임",
  },
  pinHash: {
    type: "string" as const,
    required: false,
    label: "PIN 해시",
  },
  joinedAt: {
    type: "timestamp" as const,
    defaultNow: true,
    label: "가입 시간",
  },
  lastLoginAt: {
    type: "timestamp" as const,
    defaultNow: true,
    label: "마지막 로그인",
  },
  lastPositionX: {
    type: "float" as const,
    default: 0,
    label: "마지막 X 좌표",
  },
  lastPositionY: {
    type: "float" as const,
    default: 0,
    label: "마지막 Y 좌표",
  },
  lastPositionZ: {
    type: "float" as const,
    default: 0,
    label: "마지막 Z 좌표",
  },
};
