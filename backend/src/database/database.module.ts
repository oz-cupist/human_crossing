import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

const DATABASE_POOL = 'DATABASE_POOL';

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
  constructor() {}

  async onModuleInit() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('✅ PostgreSQL 연결 성공');
    } finally {
      client.release();
      await pool.end();
    }
  }

  async onModuleDestroy() {
    console.log('🔌 PostgreSQL 연결 해제');
  }
}

export { DATABASE_POOL };
