import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateGuestbookDto {
  @ApiProperty({ description: '작성자 플레이어 ID (소유권 확인용)', example: '7a2c8c84-...' })
  @IsString()
  @IsNotEmpty()
  authorId!: string;

  @ApiProperty({ description: '수정할 내용 (1~500자)', example: '수정된 메시지' })
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  @MaxLength(500, { message: '내용은 500자 이하로 입력해주세요.' })
  content!: string;
}
