import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, "query">
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger("PrismaSQL");

  constructor() {
    super({
      log: [{ emit: "event", level: "query" }],
    });
  }

  async onModuleInit() {
    this.$on("query", (e) => {
      this.logger.debug(`[${e.duration}ms] ${e.query}`);
      if (e.params !== "[]") {
        this.logger.debug(`  Params: ${e.params}`);
      }
    });

    await this.$connect();
    console.log("✅ Prisma 연결 성공");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log("🔌 Prisma 연결 해제");
  }
}
