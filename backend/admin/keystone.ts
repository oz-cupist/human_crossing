import { config } from "@keystone-6/core";
import { buildKeystoneList } from "./lib/buildKeystoneList";
import { PLAYER_TABLE, PLAYER_FIELDS } from "../src/schema/player.schema";
import { GUESTBOOK_TABLE, GUESTBOOK_FIELDS } from "../src/schema/guestbook.schema";

export default config({
  db: {
    provider: "postgresql",
    url:
      process.env.DATABASE_URL ||
      "postgresql://human_crossing:human_crossing@localhost:5433/human_crossing",
    enableLogging: true,
  },
  server: {
    port: 4002,
  },
  lists: {
    Player: buildKeystoneList(PLAYER_TABLE, PLAYER_FIELDS),
    Guestbook: buildKeystoneList(GUESTBOOK_TABLE, GUESTBOOK_FIELDS),
  },
});
