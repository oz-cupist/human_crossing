import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../database/prisma.service";
import { PlayerDto, JoinResponseDto } from "./dto/player-response.dto";

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async join(nickname: string, pin: string): Promise<JoinResponseDto> {
    const validated = this.validateNickname(nickname);

    // [Raw SQL] SELECT * FROM players WHERE nickname = $1
    const existing = await this.prisma.player.findUnique({
      where: { nickname: validated },
    });

    if (existing) {
      // 기존 유저에 pinHash가 없으면 (레거시) PIN 설정
      if (!existing.pinHash) {
        const pinHash = await bcrypt.hash(pin, 10);
        // [Raw SQL] UPDATE players SET "pinHash" = $2, "lastLoginAt" = NOW() WHERE id = $1 RETURNING *
        const updated = await this.prisma.player.update({
          where: { id: existing.id },
          data: { pinHash, lastLoginAt: new Date() },
        });
        return {
          message: "PIN이 설정되었습니다. 다시 오셨군요!",
          player: this.toPlayerDto(updated),
          isNew: false,
        };
      }

      // PIN 검증
      const isValid = await bcrypt.compare(pin, existing.pinHash);
      if (!isValid) {
        throw new UnauthorizedException("PIN이 일치하지 않습니다.");
      }

      // [Raw SQL] UPDATE players SET "lastLoginAt" = NOW() WHERE id = $1 RETURNING *
      const updated = await this.prisma.player.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date() },
      });

      return {
        message: "다시 오셨군요!",
        player: this.toPlayerDto(updated),
        isNew: false,
      };
    }

    // 신규 가입
    try {
      const pinHash = await bcrypt.hash(pin, 10);
      // [Raw SQL] INSERT INTO players (...) VALUES (...) RETURNING *
      const created = await this.prisma.player.create({
        data: {
          nickname: validated,
          pinHash,
        },
      });

      return {
        message: "환영합니다!",
        player: this.toPlayerDto(created),
        isNew: true,
      };
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new ConflictException("이미 사용 중인 닉네임입니다.");
      }
      throw error;
    }
  }

  async updateNickname(id: string, nickname: string): Promise<PlayerDto> {
    const validated = this.validateNickname(nickname);

    try {
      // [Raw SQL] UPDATE players SET nickname = $2 WHERE id = $1 RETURNING *
      const updated = await this.prisma.player.update({
        where: { id },
        data: { nickname: validated },
      });

      return this.toPlayerDto(updated);
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new NotFoundException("플레이어를 찾을 수 없습니다.");
      }
      if (error.code === "P2002") {
        throw new ConflictException("이미 사용 중인 닉네임입니다.");
      }
      throw error;
    }
  }

  async deletePlayer(id: string): Promise<{ message: string }> {
    try {
      // [Raw SQL] DELETE FROM players WHERE id = $1 RETURNING *
      await this.prisma.player.delete({ where: { id } });
      return { message: "플레이어가 삭제되었습니다." };
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new NotFoundException("플레이어를 찾을 수 없습니다.");
      }
      throw error;
    }
  }

  async findAll(): Promise<PlayerDto[]> {
    // [Raw SQL] SELECT * FROM players ORDER BY "joinedAt" DESC
    const players = await this.prisma.player.findMany({
      orderBy: { joinedAt: "desc" },
    });
    return players.map((p) => this.toPlayerDto(p));
  }

  async findById(id: string): Promise<PlayerDto> {
    // [Raw SQL] SELECT * FROM players WHERE id = $1
    const player = await this.prisma.player.findUnique({ where: { id } });

    if (!player) {
      throw new NotFoundException("플레이어를 찾을 수 없습니다.");
    }

    return this.toPlayerDto(player);
  }

  async updatePosition(
    nickname: string,
    x: number,
    y: number,
    z: number,
  ): Promise<void> {
    // [Raw SQL] UPDATE players SET "lastPositionX" = $2, ... WHERE nickname = $1
    await this.prisma.player.update({
      where: { nickname },
      data: { lastPositionX: x, lastPositionY: y, lastPositionZ: z },
    });
  }

  async getLastPosition(
    nickname: string,
  ): Promise<{ x: number; y: number; z: number }> {
    // [Raw SQL] SELECT "lastPositionX", ... FROM players WHERE nickname = $1
    const player = await this.prisma.player.findUnique({
      where: { nickname },
      select: { lastPositionX: true, lastPositionY: true, lastPositionZ: true },
    });

    if (!player) return { x: 0, y: 0, z: 0 };

    return {
      x: player.lastPositionX,
      y: player.lastPositionY,
      z: player.lastPositionZ,
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

  private toPlayerDto(player: {
    id: string;
    nickname: string;
    joinedAt: Date;
    lastPositionX: number;
    lastPositionY: number;
    lastPositionZ: number;
  }): PlayerDto {
    return {
      id: player.id,
      nickname: player.nickname,
      joinedAt: player.joinedAt.toISOString(),
      lastPosition: {
        x: player.lastPositionX,
        y: player.lastPositionY,
        z: player.lastPositionZ,
      },
    };
  }
}
