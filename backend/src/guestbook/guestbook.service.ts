import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Pool } from "pg";
import { DATABASE_POOL } from "../database/database.module";
import { GuestbookDto } from "./dto/guestbook-response.dto";

interface GuestbookRow {
  id: string;
  authorId: string;
  authorNickname: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

@Injectable()
export class GuestbookService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(authorId: string, content: string): Promise<GuestbookDto> {
    const { rows } = await this.pool.query<GuestbookRow>(
      `INSERT INTO guestbook (id, "authorId", content, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       RETURNING *, (SELECT nickname FROM players WHERE id = $1) AS "authorNickname"`,
      [authorId, content],
    );

    return this.toDto(rows[0]);
  }

  async findAll(): Promise<GuestbookDto[]> {
    const { rows } = await this.pool.query<GuestbookRow>(
      `SELECT g.*, p.nickname AS "authorNickname"
       FROM guestbook g
       LEFT JOIN players p ON g."authorId" = p.id
       ORDER BY g."createdAt" DESC`,
    );

    return rows.map((row) => this.toDto(row));
  }

  async update(
    id: string,
    authorId: string,
    content: string,
  ): Promise<GuestbookDto> {
    // 소유권 확인
    const { rows: existing } = await this.pool.query(
      `SELECT "authorId" FROM guestbook WHERE id = $1`,
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundException("방명록을 찾을 수 없습니다.");
    }

    if (existing[0].authorId !== authorId) {
      throw new ForbiddenException("본인의 방명록만 수정할 수 있습니다.");
    }

    const { rows } = await this.pool.query<GuestbookRow>(
      `UPDATE guestbook SET content = $2, "updatedAt" = NOW() WHERE id = $1
       RETURNING *, (SELECT nickname FROM players WHERE id = guestbook."authorId") AS "authorNickname"`,
      [id, content],
    );

    return this.toDto(rows[0]);
  }

  async delete(id: string, authorId: string): Promise<{ message: string }> {
    const { rows: existing } = await this.pool.query(
      `SELECT "authorId" FROM guestbook WHERE id = $1`,
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundException("방명록을 찾을 수 없습니다.");
    }

    if (existing[0].authorId !== authorId) {
      throw new ForbiddenException("본인의 방명록만 삭제할 수 있습니다.");
    }

    await this.pool.query(`DELETE FROM guestbook WHERE id = $1`, [id]);

    return { message: "방명록이 삭제되었습니다." };
  }

  private toDto(row: GuestbookRow): GuestbookDto {
    return {
      id: row.id,
      authorId: row.authorId,
      authorNickname: row.authorNickname || "알 수 없음",
      content: row.content,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : row.createdAt,
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : row.updatedAt,
    };
  }
}
