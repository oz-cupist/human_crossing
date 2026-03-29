import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import { DATABASE_POOL } from "../database/database.module";
import { PlayerDto, JoinResponseDto } from "./dto/player-response.dto";

interface PlayerRow {
  id: string;
  nickname: string;
  pinHash: string | null;
  joinedAt: Date | string;
  lastLoginAt: Date | string;
  lastPositionX: number;
  lastPositionY: number;
  lastPositionZ: number;
}

@Injectable()
export class PlayersService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async join(nickname: string, pin: string): Promise<JoinResponseDto> {
    const validated = this.validateNickname(nickname);

    const { rows: existing } = await this.pool.query<PlayerRow>(
      `SELECT * FROM players WHERE nickname = $1`,
      [validated],
    );

    if (existing.length > 0) {
      const player = existing[0];

      // 기존 유저에 pinHash가 없으면 (레거시) PIN 설정
      if (!player.pinHash) {
        const pinHash = await bcrypt.hash(pin, 10);
        const { rows } = await this.pool.query<PlayerRow>(
          `UPDATE players SET "pinHash" = $2, "lastLoginAt" = NOW() WHERE id = $1 RETURNING *`,
          [player.id, pinHash],
        );
        return {
          message: "PIN이 설정되었습니다. 다시 오셨군요!",
          player: this.toPlayerDto(rows[0]),
          isNew: false,
        };
      }

      // PIN 검증
      const isValid = await bcrypt.compare(pin, player.pinHash);
      if (!isValid) {
        throw new UnauthorizedException("PIN이 일치하지 않습니다.");
      }

      const { rows } = await this.pool.query<PlayerRow>(
        `UPDATE players SET "lastLoginAt" = NOW() WHERE id = $1 RETURNING *`,
        [player.id],
      );

      return {
        message: "다시 오셨군요!",
        player: this.toPlayerDto(rows[0]),
        isNew: false,
      };
    }

    // 신규 가입
    try {
      const pinHash = await bcrypt.hash(pin, 10);
      const { rows } = await this.pool.query<PlayerRow>(
        `INSERT INTO players (id, nickname, "pinHash", "joinedAt", "lastLoginAt", "lastPositionX", "lastPositionY", "lastPositionZ")
         VALUES (gen_random_uuid(), $1, $2, NOW(), NOW(), 0, 0, 0)
         RETURNING *`,
        [validated, pinHash],
      );

      return {
        message: "환영합니다!",
        player: this.toPlayerDto(rows[0]),
        isNew: true,
      };
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("이미 사용 중인 닉네임입니다.");
      }
      throw error;
    }
  }

  async updateNickname(id: string, nickname: string): Promise<PlayerDto> {
    const validated = this.validateNickname(nickname);

    try {
      const { rows } = await this.pool.query<PlayerRow>(
        `UPDATE players SET nickname = $2 WHERE id = $1 RETURNING *`,
        [id, validated],
      );

      if (rows.length === 0) {
        throw new NotFoundException("플레이어를 찾을 수 없습니다.");
      }

      return this.toPlayerDto(rows[0]);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("이미 사용 중인 닉네임입니다.");
      }
      throw error;
    }
  }

  async deletePlayer(id: string): Promise<{ message: string }> {
    const { rows } = await this.pool.query<PlayerRow>(
      `DELETE FROM players WHERE id = $1 RETURNING *`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException("플레이어를 찾을 수 없습니다.");
    }

    return { message: "플레이어가 삭제되었습니다." };
  }

  async findAll(): Promise<PlayerDto[]> {
    const { rows } = await this.pool.query<PlayerRow>(
      `SELECT * FROM players ORDER BY "joinedAt" DESC`,
    );
    return rows.map((row) => this.toPlayerDto(row));
  }

  async findById(id: string): Promise<PlayerDto> {
    const { rows } = await this.pool.query<PlayerRow>(
      `SELECT * FROM players WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException("플레이어를 찾을 수 없습니다.");
    }

    return this.toPlayerDto(rows[0]);
  }

  async updatePosition(
    nickname: string,
    x: number,
    y: number,
    z: number,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE players
       SET "lastPositionX" = $2, "lastPositionY" = $3, "lastPositionZ" = $4
       WHERE nickname = $1`,
      [nickname, x, y, z],
    );
  }

  async getLastPosition(
    nickname: string,
  ): Promise<{ x: number; y: number; z: number }> {
    const { rows } = await this.pool.query<
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
      throw new BadRequestException("닉네임을 입력해주세요.");
    }

    const trimmed = nickname.trim();

    if (trimmed.length > 20) {
      throw new BadRequestException("닉네임은 20자 이하로 입력해주세요.");
    }

    return trimmed;
  }

  private toPlayerDto(row: PlayerRow): PlayerDto {
    return {
      id: row.id,
      nickname: row.nickname,
      joinedAt:
        row.joinedAt instanceof Date
          ? row.joinedAt.toISOString()
          : row.joinedAt,
      lastPosition: {
        x: row.lastPositionX,
        y: row.lastPositionY,
        z: row.lastPositionZ,
      },
    };
  }
}
