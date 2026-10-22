import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { IAIProvider, AIMessageHistory, AIProviderResponse, AIAttachment } from './ai-provider.interface';

@Injectable()
export class OllamaProvider implements IAIProvider {
  name = 'Ollama (Local LLM)';
  private readonly logger = new Logger(OllamaProvider.name);

  private getBaseUrl(): string {
    return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  private getModel(): string {
    return process.env.OLLAMA_MODEL || 'llama3.2';
  }

  private getTimeoutMs(): number {
    return parseInt(process.env.AI_TIMEOUT_MS || '15000', 10);
  }

  async isAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/tags`, {
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateResponse(
    prompt: string,
    systemPrompt: string,
    history: AIMessageHistory[],
    attachment?: AIAttachment,
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const baseUrl = this.getBaseUrl();
    const model = this.getModel();
    const timeoutMs = this.getTimeoutMs();

    const userMessage: any = { role: 'user', content: prompt };
    if (attachment?.base64 && attachment.mimeType.startsWith('image/')) {
      userMessage.images = [attachment.base64];
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      userMessage,
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API responded with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const responseTimeMs = Date.now() - startTime;

      return {
        content: data.message?.content || 'No response content received from local AI model.',
        provider: 'ollama',
        model,
        responseTimeMs,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new ServiceUnavailableException({
          code: 'AI_PROVIDER_TIMEOUT',
          message: `Local AI service (Ollama) timed out after ${timeoutMs}ms.`,
        });
      }

      this.logger.error(`Ollama connection error: ${err.message}`);
      throw new ServiceUnavailableException({
        code: 'OLLAMA_PROVIDER_UNAVAILABLE',
        message: `Local AI service (Ollama) is currently unreachable at ${baseUrl}.`,
        setupInstructions: [
          '1. Ensure Ollama is installed from https://ollama.com',
          `2. Start Ollama and pull the required model: "ollama run ${model}"`,
          '3. Alternatively, switch AI_PROVIDER=gemini in .env and configure GEMINI_API_KEY for cloud model inference.',
        ],
        details: err.message,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
