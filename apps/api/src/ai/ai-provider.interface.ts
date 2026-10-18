export interface AIMessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
  ): Promise<AIProviderResponse>;
}
