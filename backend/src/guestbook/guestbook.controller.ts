import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GuestbookService } from './guestbook.service';
import { CreateGuestbookDto } from './dto/create-guestbook.dto';
import { UpdateGuestbookDto } from './dto/update-guestbook.dto';
import { GuestbookDto } from './dto/guestbook-response.dto';

@ApiTags('Guestbook')
@Controller('api/guestbook')
export class GuestbookController {
  constructor(private readonly guestbookService: GuestbookService) {}

  @Post()
  @ApiOperation({ summary: '방명록 작성' })
  @ApiResponse({ status: 201, description: '작성 성공', type: GuestbookDto })
  async create(@Body() dto: CreateGuestbookDto): Promise<GuestbookDto> {
    return this.guestbookService.create(dto.authorId, dto.content);
  }

  @Get()
  @ApiOperation({ summary: '방명록 목록 조회' })
  @ApiResponse({ status: 200, description: '방명록 목록', type: [GuestbookDto] })
  async findAll(): Promise<GuestbookDto[]> {
    return this.guestbookService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: '방명록 수정' })
  @ApiParam({ name: 'id', description: '방명록 UUID' })
  @ApiResponse({ status: 200, description: '수정 성공', type: GuestbookDto })
  @ApiResponse({ status: 403, description: '본인의 방명록만 수정 가능' })
  @ApiResponse({ status: 404, description: '방명록을 찾을 수 없음' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGuestbookDto,
  ): Promise<GuestbookDto> {
    return this.guestbookService.update(id, dto.authorId, dto.content);
  }

  @Delete(':id')
  @ApiOperation({ summary: '방명록 삭제' })
  @ApiParam({ name: 'id', description: '방명록 UUID' })
  @ApiQuery({ name: 'authorId', description: '작성자 ID (소유권 확인용)' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 403, description: '본인의 방명록만 삭제 가능' })
  @ApiResponse({ status: 404, description: '방명록을 찾을 수 없음' })
  async delete(
    @Param('id') id: string,
    @Query('authorId') authorId: string,
  ) {
    return this.guestbookService.delete(id, authorId);
  }
}
