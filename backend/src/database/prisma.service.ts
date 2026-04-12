import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    console.log("✅ Prisma 연결 성공");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log("🔌 Prisma 연결 해제");
  }
}
