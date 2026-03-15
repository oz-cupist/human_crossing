// ============================================================
// [Prisma 버전] - 주석 해제하면 Prisma ORM으로 전환됩니다
// ============================================================
// import { prisma } from "../config/prisma";
// import { toPlayerDTO } from "../mappers/player.mapper";
// import { AppError, BadRequestError, ConflictError } from "../errors/AppError";
// import type { PlayerDTO, JoinResponseDTO } from "../types/player";
//
// export class PlayerService {
//   async join(nickname: unknown): Promise<JoinResponseDTO> {
//     const validated = this.validateNickname(nickname);
//     const existing = await prisma.player.findUnique({ where: { nickname: validated } });
//     if (existing) {
//       const player = await prisma.player.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } });
//       return { message: "다시 오셨군요!", player: toPlayerDTO(player), isNew: false };
//     }
//     try {
//       const player = await prisma.player.create({ data: { nickname: validated } });
//       return { message: "환영합니다!", player: toPlayerDTO(player), isNew: true };
//     } catch (error: any) {
//       if (error.code === "P2002") throw new ConflictError("이미 사용 중인 닉네임입니다.");
//       throw error;
//     }
//   }
//   async findAll(): Promise<PlayerDTO[]> {
//     const players = await prisma.player.findMany({ orderBy: { joinedAt: "desc" } });
//     return players.map(toPlayerDTO);
//   }
//   async findById(id: string): Promise<PlayerDTO> {
//     const player = await prisma.player.findUnique({ where: { id } });
//     if (!player) throw new AppError(404, "플레이어를 찾을 수 없습니다.");
//     return toPlayerDTO(player);
//   }
//   async updatePosition(nickname: string, x: number, y: number, z: number): Promise<void> {
//     await prisma.player.update({ where: { nickname }, data: { lastPositionX: x, lastPositionY: y, lastPositionZ: z } });
//   }
//   async getLastPosition(nickname: string) {
//     const player = await prisma.player.findUnique({ where: { nickname }, select: { lastPositionX: true, lastPositionY: true, lastPositionZ: true } });
//     if (!player) return { x: 0, y: 0, z: 0 };
//     return { x: player.lastPositionX, y: player.lastPositionY, z: player.lastPositionZ };
//   }
//   private validateNickname(nickname: unknown): string {
//     if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) throw new BadRequestError("닉네임을 입력해주세요.");
//     const trimmed = nickname.trim();
//     if (trimmed.length > 20) throw new BadRequestError("닉네임은 20자 이하로 입력해주세요.");
//     return trimmed;
//   }
// }
// export const playerService = new PlayerService();

// ============================================================
// [Raw SQL 버전] - pg 라이브러리로 직접 SQL 실행
// ============================================================
import { pool } from "../config/database";
import { toPlayerDTO, type PlayerRow } from "../mappers/player.mapper";
import { AppError, BadRequestError, ConflictError } from "../errors/AppError";
import type { PlayerDTO, JoinResponseDTO } from "../types/player";

export class PlayerService {
  async join(nickname: unknown): Promise<JoinResponseDTO> {
    const validated = this.validateNickname(nickname);

    // SELECT * FROM players WHERE nickname = $1
    const { rows: existing } = await pool.query<PlayerRow>(
      `SELECT * FROM players WHERE nickname = $1`,
      [validated],
    );

    if (existing.length > 0) {
      // UPDATE players SET "lastLoginAt" = NOW() WHERE id = $1 RETURNING *
      const { rows } = await pool.query<PlayerRow>(
        `UPDATE players SET "lastLoginAt" = NOW() WHERE id = $1 RETURNING *`,
        [existing[0].id],
      );

      return {
        message: "다시 오셨군요!",
        player: toPlayerDTO(rows[0]),
        isNew: false,
      };
    }

    try {
      // INSERT INTO players (id, nickname, "joinedAt", "lastLoginAt") VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING *
      const { rows } = await pool.query<PlayerRow>(
        `INSERT INTO players (id, nickname, "joinedAt", "lastLoginAt", "lastPositionX", "lastPositionY", "lastPositionZ")
         VALUES (gen_random_uuid(), $1, NOW(), NOW(), 0, 0, 0)
         RETURNING *`,
        [validated],
      );

      return {
        message: "환영합니다!",
        player: toPlayerDTO(rows[0]),
        isNew: true,
      };
    } catch (error: any) {
      // unique_violation (PostgreSQL error code 23505)
      if (error.code === "23505") {
        throw new ConflictError("이미 사용 중인 닉네임입니다.");
      }
      throw error;
    }
  }

  async findAll(): Promise<PlayerDTO[]> {
    // SELECT * FROM players ORDER BY "joinedAt" DESC
    const { rows } = await pool.query<PlayerRow>(
      `SELECT * FROM players ORDER BY "joinedAt" DESC`,
    );
    return rows.map(toPlayerDTO);
  }

  async findById(id: string): Promise<PlayerDTO> {
    // SELECT * FROM players WHERE id = $1
    const { rows } = await pool.query<PlayerRow>(
      `SELECT * FROM players WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new AppError(404, "플레이어를 찾을 수 없습니다.");
    }

    return toPlayerDTO(rows[0]);
  }

  async updatePosition(
    nickname: string,
    x: number,
    y: number,
    z: number,
  ): Promise<void> {
    // UPDATE players SET "lastPositionX" = $2, "lastPositionY" = $3, "lastPositionZ" = $4 WHERE nickname = $1
    await pool.query(
      `UPDATE players
       SET "lastPositionX" = $2, "lastPositionY" = $3, "lastPositionZ" = $4
       WHERE nickname = $1`,
      [nickname, x, y, z],
    );
  }

  async getLastPosition(nickname: string) {
    // SELECT "lastPositionX", "lastPositionY", "lastPositionZ" FROM players WHERE nickname = $1
    const { rows } = await pool.query<
      Pick<PlayerRow, "lastPositionX" | "lastPositionY" | "lastPositionZ">
    >(
      `SELECT "lastPositionX", "lastPositionY", "lastPositionZ"
       FROM players WHERE nickname = $1`,
      [nickname],
    );

    if (rows.length === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: rows[0].lastPositionX,
      y: rows[0].lastPositionY,
      z: rows[0].lastPositionZ,
    };
  }

  private validateNickname(nickname: unknown): string {
    if (
      !nickname ||
      typeof nickname !== "string" ||
      nickname.trim().length === 0
    ) {
      throw new BadRequestError("닉네임을 입력해주세요.");
    }

    const trimmed = nickname.trim();

    if (trimmed.length > 20) {
      throw new BadRequestError("닉네임은 20자 이하로 입력해주세요.");
    }

    return trimmed;
  }
}

export const playerService = new PlayerService();
