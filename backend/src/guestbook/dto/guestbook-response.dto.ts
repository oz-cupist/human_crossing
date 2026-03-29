import { ApiProperty } from '@nestjs/swagger';

export class GuestbookDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  authorId!: string;

  @ApiProperty({ type: String })
  authorNickname!: string;

  @ApiProperty({ type: String })
  content!: string;

  @ApiProperty({ type: String })
  createdAt!: string;

  @ApiProperty({ type: String })
  updatedAt!: string;
}
