import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class JoinPlayerDto {
  @ApiProperty({
    description: '플레이어 닉네임 (1~20자)',
    example: '플레이어1',
  })
  @IsString()
  @IsNotEmpty({ message: '닉네임을 입력해주세요.' })
  @MaxLength(20, { message: '닉네임은 20자 이하로 입력해주세요.' })
  nickname!: string;
}
