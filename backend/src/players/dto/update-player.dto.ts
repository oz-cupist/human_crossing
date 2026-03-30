import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdatePlayerDto {
  @ApiProperty({
    description: '변경할 닉네임 (1~20자)',
    example: '새닉네임',
  })
  @IsString()
  @IsNotEmpty({ message: '닉네임을 입력해주세요.' })
  @MaxLength(20, { message: '닉네임은 20자 이하로 입력해주세요.' })
  nickname!: string;
}
