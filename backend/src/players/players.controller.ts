import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { JoinPlayerDto } from './dto/join-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayerDto, JoinResponseDto } from './dto/player-response.dto';

@ApiTags('Players')
@Controller('api/players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '닉네임 + PIN으로 가입 또는 로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공', type: JoinResponseDto })
  @ApiResponse({ status: 400, description: '유효성 검증 실패' })
  @ApiResponse({ status: 401, description: 'PIN 불일치' })
  @ApiResponse({ status: 409, description: '닉네임 중복' })
  async join(@Body() dto: JoinPlayerDto): Promise<JoinResponseDto> {
    return this.playersService.join(dto.nickname, dto.pin);
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

  @Patch(':id')
  @ApiOperation({ summary: '닉네임 변경' })
  @ApiParam({ name: 'id', description: '플레이어 UUID' })
  @ApiResponse({ status: 200, description: '닉네임 변경 성공', type: PlayerDto })
  @ApiResponse({ status: 404, description: '플레이어를 찾을 수 없음' })
  @ApiResponse({ status: 409, description: '닉네임 중복' })
  async updateNickname(
    @Param('id') id: string,
    @Body() dto: UpdatePlayerDto,
  ): Promise<PlayerDto> {
    return this.playersService.updateNickname(id, dto.nickname);
  }

  @Delete(':id')
  @ApiOperation({ summary: '플레이어 삭제 (회원탈퇴)' })
  @ApiParam({ name: 'id', description: '플레이어 UUID' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '플레이어를 찾을 수 없음' })
  async deletePlayer(@Param('id') id: string) {
    return this.playersService.deletePlayer(id);
  }
}
