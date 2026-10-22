import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIProvider, AIMessageHistory, AIProviderResponse, AIAttachment } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements IAIProvider {
  name = 'Google Gemini (Cloud AI)';
  private readonly logger = new Logger(GeminiProvider.name);

  private getApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  }

  private getModelName(): string {
    return process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  }

  private getTimeoutMs(): number {
    return parseInt(process.env.AI_TIMEOUT_MS || '30000', 10);
  }

  private sanitize(text: string): string {
    if (!text) return '';
    return text
      .replace(/key=[A-Za-z0-9_-]+/gi, 'key=[REDACTED]')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/AQ\.[A-Za-z0-9_-]+/g, '[REDACTED_API_KEY]');
  }

  async isAvailable(): Promise<boolean> {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 10);
  }

  private async callGemini(
    modelName: string,
    apiKey: string,
    prompt: string,
    systemPrompt: string,
    history: AIMessageHistory[],
    timeoutMs: number,
    startTime: number,
    attachment?: AIAttachment,
  ): Promise<AIProviderResponse> {
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
    });

    const contents: any[] = history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const userParts: any[] = [];
    if (attachment?.base64 && attachment?.mimeType) {
      userParts.push({
        inlineData: {
          data: attachment.base64,
          mimeType: attachment.mimeType,
        },
      });
    }
    userParts.push({ text: prompt });

    contents.push({
      role: 'user',
      parts: userParts,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const timeoutErr = new Error(`Gemini generation request timed out after ${timeoutMs}ms`);
        timeoutErr.name = 'TimeoutError';
        reject(timeoutErr);
      }, timeoutMs);
    });

    const generatePromise = model.generateContent({ contents });
    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text();
    const responseTimeMs = Date.now() - startTime;

    return {
      content: text,
      provider: 'gemini',
      model: modelName,
      responseTimeMs,
    };
  }

  async generateResponse(
    prompt: string,
    systemPrompt: string,
    history: AIMessageHistory[],
    attachment?: AIAttachment,
  ): Promise<AIProviderResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.trim().length === 0) {
      throw new ServiceUnavailableException({
        code: 'GEMINI_KEY_MISSING',
        message: 'GEMINI_API_KEY environment variable is not configured on the backend server.',
        setupInstructions: [
          '1. Obtain an API key from Google AI Studio (https://aistudio.google.com)',
          '2. Add GEMINI_API_KEY=your_key to apps/api/.env',
          '3. Ensure AI_PROVIDER=gemini is configured in apps/api/.env',
        ],
      });
    }

    const startTime = Date.now();
    const primaryModel = this.getModelName();
    const timeoutMs = this.getTimeoutMs();

    try {
      return await this.callGemini(primaryModel, apiKey, prompt, systemPrompt, history, timeoutMs, startTime, attachment);
    } catch (err: any) {
      // If primary model encounters high demand (503), attempt failover to gemini-flash-lite-latest
      if ((err.message?.includes('503') || err.message?.includes('high demand')) && primaryModel !== 'gemini-flash-lite-latest') {
        try {
          this.logger.warn(`Gemini model ${primaryModel} busy. Seamlessly retrying with gemini-flash-lite-latest.`);
          return await this.callGemini('gemini-flash-lite-latest', apiKey, prompt, systemPrompt, history, timeoutMs, startTime, attachment);
        } catch (failoverErr: any) {
          err = failoverErr;
        }
      }

      const safeErrorMessage = this.sanitize(err.message || 'Unknown Gemini error');
      this.logger.error(`Gemini generation error: ${safeErrorMessage}`);

      if (err.name === 'TimeoutError') {
        throw new ServiceUnavailableException({
          code: 'AI_PROVIDER_TIMEOUT',
          message: `Cloud AI provider (Gemini) timed out after ${timeoutMs}ms`,
        });
      }

      if (
        safeErrorMessage.includes('429') ||
        safeErrorMessage.toLowerCase().includes('quota') ||
        safeErrorMessage.toLowerCase().includes('rate limit')
      ) {
        throw new ServiceUnavailableException({
          code: 'GEMINI_RATE_LIMIT',
          message: 'Gemini request quota exceeded. Please wait a moment before trying again.',
          details: safeErrorMessage,
        });
      }

      if (
        safeErrorMessage.includes('403') ||
        safeErrorMessage.includes('401') ||
        safeErrorMessage.includes('API_KEY_INVALID') ||
        safeErrorMessage.includes('API_KEY_SERVICE_BLOCKED')
      ) {
        throw new ServiceUnavailableException({
          code: 'GEMINI_AUTH_ERROR',
          message: 'Gemini API authentication failed or Generative Language API is blocked for this key.',
          setupInstructions: [
            '1. Ensure GEMINI_API_KEY in apps/api/.env is a valid key from Google AI Studio (https://aistudio.google.com)',
            '2. In Google Cloud Console, ensure "Generative Language API" is enabled and not restricted on this key.',
          ],
          details: safeErrorMessage,
        });
      }

      throw new ServiceUnavailableException({
        code: 'GEMINI_API_ERROR',
        message: `Gemini API call failed: ${safeErrorMessage}`,
        details: safeErrorMessage,
      });
    }
  }
}
