import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AIChatDto } from './dto/ai-chat.dto';

@ApiTags('AI Health Assistant')
@Controller('api/ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check AI provider configuration, model, and availability status' })
  async getStatus() {
    const status = await this.aiService.getStatus();
    return {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit query to AI Health Assistant with deterministic triage check' })
  async chat(@CurrentUser() user: any, @Body() body: AIChatDto) {
    const result = await this.aiService.handleChatMessage(user, body);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List user chat conversation threads' })
  async listConversations(@CurrentUser() user: any) {
    const threads = await this.aiService.listConversations(user.id);
    return {
      success: true,
      data: threads,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get full message history for a conversation thread' })
  async getConversation(@CurrentUser() user: any, @Param('id') id: string) {
    const thread = await this.aiService.getConversation(user.id, id);
    return {
      success: true,
      data: thread,
      timestamp: new Date().toISOString(),
    };
  }
}
