import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('LiveCare Consultation & Telehealth')
@Controller('api/consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Get('session/:id')
  @ApiOperation({ summary: 'Get consultation session details and time window status' })
  async getSessionDetails(@CurrentUser() user: any, @Param('id') id: string) {
    const session = await this.consultationsService.getSessionDetails(user, id);
    return {
      success: true,
      data: session,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('session/:id/join')
  @ApiOperation({ summary: 'Join consultation room when window is open' })
  async joinSession(@CurrentUser() user: any, @Param('id') id: string) {
    const session = await this.consultationsService.joinSession(user, id);
    return {
      success: true,
      message: 'Joined consultation session',
      data: session,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('session/:id/end')
  @ApiOperation({ summary: 'End consultation session and mark appointment completed' })
  async endSession(@CurrentUser() user: any, @Param('id') id: string) {
    const session = await this.consultationsService.endSession(user, id);
    return {
      success: true,
      message: 'Consultation session concluded',
      data: session,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('session/:id/messages')
  @ApiOperation({ summary: 'Get consultation chat message history' })
  async getMessages(@CurrentUser() user: any, @Param('id') id: string) {
    const messages = await this.consultationsService.getMessages(user, id);
    return {
      success: true,
      data: messages,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('session/:id/messages')
  @ApiOperation({ summary: 'Send text message or share medical record in consultation chat' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('content') content: string,
    @Body('sharedDocumentId') sharedDocumentId?: string,
  ) {
    const message = await this.consultationsService.sendMessage(user, id, content, sharedDocumentId);
    return {
      success: true,
      data: message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('session/:id/signal')
  @ApiOperation({ summary: 'Send WebRTC signaling message (offer, answer, ICE candidate)' })
  async sendSignal(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('type') type: string,
    @Body('data') data: any,
  ) {
    const signal = await this.consultationsService.sendSignal(user, id, type, data);
    return {
      success: true,
      data: signal,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('session/:id/signals')
  @ApiOperation({ summary: 'Poll incoming WebRTC signaling messages from peer' })
  async getSignals(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('since') since?: string,
  ) {
    const signals = await this.consultationsService.getSignals(user, id, since);
    return {
      success: true,
      data: signals,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('session/:id/documents')
  @ApiOperation({ summary: 'List patient medical records available to share in consultation' })
  async getPatientDocuments(@CurrentUser() user: any, @Param('id') id: string) {
    const documents = await this.consultationsService.getPatientDocuments(user, id);
    return {
      success: true,
      data: documents,
      timestamp: new Date().toISOString(),
    };
  }
}
