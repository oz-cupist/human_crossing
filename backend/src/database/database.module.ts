import {
  Module,
  Global,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { Pool } from "pg";

const DATABASE_POOL = "DATABASE_POOL";

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () => {
        return new Pool({
          connectionString: process.env.DATABASE_URL,
        });
      },
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onModuleInit() {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
      console.log("✅ PostgreSQL 연결 성공");
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log("🔌 PostgreSQL 연결 해제");
  }
}

export { DATABASE_POOL };
