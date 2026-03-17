import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { JoinPlayerDto } from './dto/join-player.dto';
import { PlayerDto, JoinResponseDto } from './dto/player-response.dto';

@ApiTags('Players')
@Controller('api/players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '닉네임으로 가입 또는 로그인' })
  @ApiResponse({ status: 200, description: '기존 유저 로그인 성공', type: JoinResponseDto })
  @ApiResponse({ status: 201, description: '신규 가입 성공', type: JoinResponseDto })
  @ApiResponse({ status: 400, description: '닉네임 유효성 검증 실패' })
  @ApiResponse({ status: 409, description: '닉네임 중복' })
  async join(@Body() dto: JoinPlayerDto): Promise<JoinResponseDto> {
    return this.playersService.join(dto.nickname);
  }

  @Get()
  @ApiOperation({ summary: '플레이어 목록 조회' })
  @ApiResponse({ status: 200, description: '플레이어 목록', type: [PlayerDto] })
  async findAll(): Promise<PlayerDto[]> {
    return this.playersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '플레이어 단건 조회' })
  @ApiParam({ name: 'id', description: '플레이어 UUID' })
  @ApiResponse({ status: 200, description: '플레이어 정보', type: PlayerDto })
  @ApiResponse({ status: 404, description: '플레이어를 찾을 수 없음' })
  async findById(@Param('id') id: string): Promise<PlayerDto> {
    return this.playersService.findById(id);
  }
}
