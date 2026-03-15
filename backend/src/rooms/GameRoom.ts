import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { playerService } from "../services/player.service";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") nickname: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("string") action: string = "idle";
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

export class GameRoom extends Room<{ state: GameState }> {
  maxClients = 50;

  onCreate() {
    this.state = new GameState();
    console.log("🏠 GameRoom 생성됨");

    this.onMessage(
      "move",
      (client, data: { x: number; y: number; z: number; action: string }) => {
        const player = this.state.players.get(client.sessionId);
        if (player) {
          player.x = data.x;
          player.y = data.y;
          player.z = data.z;
          player.action = data.action || "idle";
        }
      },
    );
  }

  async onJoin(client: Client, options: { nickname: string }) {
    const nickname = options.nickname || "익명";
    console.log(`👤 ${nickname} 접속 (${client.sessionId})`);

    const lastPosition = await playerService.getLastPosition(nickname);

    const player = new PlayerState();
    player.id = client.sessionId;
    player.nickname = nickname;
    player.x = lastPosition.x;
    player.y = lastPosition.y;
    player.z = lastPosition.z;
    player.action = "idle";

    this.state.players.set(client.sessionId, player);
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👋 ${player.nickname} 퇴장`);
      await playerService
        .updatePosition(player.nickname, player.x, player.y, player.z)
        .catch((err) => console.error("위치 저장 실패:", err));
    }
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("🏠 GameRoom 소멸됨");
  }
}
