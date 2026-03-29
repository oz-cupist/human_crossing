import { Module } from '@nestjs/common';
import { PlayersModule } from './players/players.module';
import { DatabaseModule } from './database/database.module';
import { GameModule } from './game/game.module';
import { GuestbookModule } from './guestbook/guestbook.module';

@Module({
  imports: [DatabaseModule, PlayersModule, GameModule, GuestbookModule],
})
export class AppModule {}
