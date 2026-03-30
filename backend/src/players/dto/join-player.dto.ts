import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class JoinPlayerDto {
  @ApiProperty({
    description: '플레이어 닉네임 (1~20자)',
    example: '플레이어1',
  })
  @IsString()
  @IsNotEmpty({ message: '닉네임을 입력해주세요.' })
  @MaxLength(20, { message: '닉네임은 20자 이하로 입력해주세요.' })
  nickname!: string;

  @ApiProperty({
    description: 'PIN 번호 (4~6자리 숫자)',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty({ message: 'PIN을 입력해주세요.' })
  @Matches(/^\d{4,6}$/, { message: 'PIN은 4~6자리 숫자여야 합니다.' })
  pin!: string;
}
