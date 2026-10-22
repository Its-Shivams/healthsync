import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Root' })
  getRoot() {
    return {
      service: 'HealthSync API',
      status: 'online',
      version: '1.0.0',
      docs: '/api/docs',
    };
  }

  @Get('api/health')
  @ApiOperation({ summary: 'Health check probe for load balancers and deployment services' })
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
