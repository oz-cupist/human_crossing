import { Room, Client } from 'colyseus';
import { Schema, MapSchema, type } from '@colyseus/schema';
import { Pool } from 'pg';

export class PlayerState extends Schema {
  @type('string') id: string = '';
  @type('string') nickname: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') z: number = 0;
  @type('number') rotationY: number = 0;
  @type('number') character: number = 0;
  @type('string') action: string = 'idle';
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

export class GameRoom extends Room {
  maxClients = 50;
  private pool!: Pool;
  declare state: GameState;

  onCreate() {
    this.setState(new GameState());
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    console.log('🏠 GameRoom 생성됨');

    this.onMessage(
      'move',
      (client, data: { x: number; y: number; z: number; rotationY: number; action: string }) => {
        const player = this.state.players.get(client.sessionId);
        if (player) {
          player.x = data.x;
          player.y = data.y;
          player.z = data.z;
          player.rotationY = data.rotationY ?? 0;
          player.action = data.action || 'idle';
        }
      },
    );
  }

  async onJoin(client: Client, options: { nickname: string; character?: number }) {
    const nickname = options.nickname || '익명';
    console.log(`👤 ${nickname} 접속 (${client.sessionId})`);

    const lastPosition = await this.getLastPosition(nickname);

    const player = new PlayerState();
    player.id = client.sessionId;
    player.nickname = nickname;
    player.x = lastPosition.x;
    player.y = lastPosition.y;
    player.z = lastPosition.z;
    player.character = options.character ?? 0;
    player.action = 'idle';

    this.state.players.set(client.sessionId, player);
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👋 ${player.nickname} 퇴장`);
      await this.updatePosition(player.nickname, player.x, player.y, player.z).catch(
        (err) => console.error('위치 저장 실패:', err),
      );
    }
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    this.pool.end();
    console.log('🏠 GameRoom 소멸됨');
  }

  private async getLastPosition(
    nickname: string,
  ): Promise<{ x: number; y: number; z: number }> {
    const { rows } = await this.pool.query(
      `SELECT "lastPositionX", "lastPositionY", "lastPositionZ" FROM players WHERE nickname = $1`,
      [nickname],
    );

    if (rows.length === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: rows[0].lastPositionX,
      y: rows[0].lastPositionY,
      z: rows[0].lastPositionZ,
    };
  }

  private async updatePosition(
    nickname: string,
    x: number,
    y: number,
    z: number,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE players SET "lastPositionX" = $2, "lastPositionY" = $3, "lastPositionZ" = $4 WHERE nickname = $1`,
      [nickname, x, y, z],
    );
  }
}
