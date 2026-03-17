import { ApiProperty } from '@nestjs/swagger';

export class PositionDto {
  @ApiProperty({ example: 0 })
  x!: number;

  @ApiProperty({ example: 0 })
  y!: number;

  @ApiProperty({ example: 0 })
  z!: number;
}

export class PlayerDto {
  @ApiProperty({ example: '7a2c8c84-7d92-43c6-8ad6-aa9d96e273bb' })
  id!: string;

  @ApiProperty({ example: '플레이어1' })
  nickname!: string;

  @ApiProperty({ example: '2026-03-15T07:53:32.643Z' })
  joinedAt!: string;

  @ApiProperty({ type: PositionDto })
  lastPosition!: PositionDto;
}

export class JoinResponseDto {
  @ApiProperty({ example: '환영합니다!' })
  message!: string;

  @ApiProperty({ type: PlayerDto })
  player!: PlayerDto;

  @ApiProperty({ example: true })
  isNew!: boolean;
}
