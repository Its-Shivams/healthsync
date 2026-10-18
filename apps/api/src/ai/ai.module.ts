import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { TriageEngineService } from './triage-engine.service';
import { OllamaProvider } from './ollama.provider';
import { GeminiProvider } from './gemini.provider';
import { DemoClinicalProvider } from './demo.provider';

@Module({
  controllers: [AIController],
  providers: [
    AIService,
    TriageEngineService,
    OllamaProvider,
    GeminiProvider,
    DemoClinicalProvider,
  ],
  exports: [AIService, TriageEngineService],
})
export class AIModule {}
