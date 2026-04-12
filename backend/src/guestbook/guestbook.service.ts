import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { GuestbookDto } from "./dto/guestbook-response.dto";

@Injectable()
export class GuestbookService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, content: string): Promise<GuestbookDto> {
    // [Raw SQL] INSERT INTO guestbook (...) VALUES (...) RETURNING *, (SELECT nickname FROM players WHERE id = $1) AS "authorNickname"
    const entry = await this.prisma.guestbook.create({
      data: { authorId, content },
      include: { author: { select: { nickname: true } } },
    });

    return this.toDto(entry);
  }

  async findAll(): Promise<GuestbookDto[]> {
    // [Raw SQL] SELECT g.*, p.nickname AS "authorNickname" FROM guestbook g LEFT JOIN players p ON g."authorId" = p.id ORDER BY g."createdAt" DESC
    const entries = await this.prisma.guestbook.findMany({
      include: { author: { select: { nickname: true } } },
      orderBy: { createdAt: "desc" },
    });

    return entries.map((e) => this.toDto(e));
  }

  async update(
    id: string,
    authorId: string,
    content: string,
  ): Promise<GuestbookDto> {
    // [Raw SQL] SELECT "authorId" FROM guestbook WHERE id = $1
    const existing = await this.prisma.guestbook.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("방명록을 찾을 수 없습니다.");
    }

    if (existing.authorId !== authorId) {
      throw new ForbiddenException("본인의 방명록만 수정할 수 있습니다.");
    }

    // [Raw SQL] UPDATE guestbook SET content = $2, "updatedAt" = NOW() WHERE id = $1 RETURNING *, (SELECT nickname ...) AS "authorNickname"
    const updated = await this.prisma.guestbook.update({
      where: { id },
      data: { content },
      include: { author: { select: { nickname: true } } },
    });

    return this.toDto(updated);
  }

  async delete(id: string, authorId: string): Promise<{ message: string }> {
    // [Raw SQL] SELECT "authorId" FROM guestbook WHERE id = $1
    const existing = await this.prisma.guestbook.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("방명록을 찾을 수 없습니다.");
    }

    if (existing.authorId !== authorId) {
      throw new ForbiddenException("본인의 방명록만 삭제할 수 있습니다.");
    }

    // [Raw SQL] DELETE FROM guestbook WHERE id = $1
    await this.prisma.guestbook.delete({ where: { id } });

    return { message: "방명록이 삭제되었습니다." };
  }

  private toDto(entry: {
    id: string;
    authorId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: { nickname: string };
  }): GuestbookDto {
    return {
      id: entry.id,
      authorId: entry.authorId,
      authorNickname: entry.author.nickname,
      content: entry.content,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
