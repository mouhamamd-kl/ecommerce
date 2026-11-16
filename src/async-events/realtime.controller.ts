import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, Matches, MaxLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RealtimeService, type RealtimeUser } from './realtime.service.js';

export class ChannelAuthorizationDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^private-(admin\.orders|orders\.[1-9]\d*)$/)
  channel_name: string;
  @IsString()
  @MaxLength(100)
  @Matches(/^\d+\.\d+$/)
  socket_id: string;
}

@ApiTags('Real-time orders')
@ApiBearerAuth('access-token')
@Controller({ path: 'realtime', version: '1' })
@UseGuards(AuthGuard(['admin-jwt', 'customer-jwt']))
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}
  @Get('config')
  config() {
    return {
      status: 'success',
      message: 'Real-time connection settings.',
      data: this.realtime.clientConfig(),
    };
  }
  @Post('auth')
  @HttpCode(200)
  async authorize(
    @Req() request: { user: RealtimeUser },
    @Body() body: ChannelAuthorizationDto,
  ) {
    return {
      status: 'success',
      message: 'Channel authorized.',
      data: await this.realtime.authorize(
        request.user,
        body.channel_name,
        body.socket_id,
      ),
    };
  }
}
