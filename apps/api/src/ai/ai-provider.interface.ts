export interface AIMessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIAttachment {
  base64: string;
  mimeType: string;
  fileName?: string;
}

export interface AIProviderResponse {
  content: string;
  provider: string;
  model: string;
  responseTimeMs: number;
}

export interface IAIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateResponse(
    prompt: string,
    systemPrompt: string,
    history: AIMessageHistory[],
    attachment?: AIAttachment,
  ): Promise<AIProviderResponse>;
}
