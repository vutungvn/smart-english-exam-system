import { ApiError, GoogleGenAI, type Part } from '@google/genai';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema.js';
import { AiProvider, AiProviderError } from './ai-provider.js';
import type { AiProviderRequest, AiProviderResponse } from './ai.types.js';

/** Thời gian chờ tối đa một lần gọi */
const CALL_TIMEOUT_MS = 30_000;

/** Gọi Gemini qua @google/genai, trả JSON theo responseJsonSchema (structured output) */
export class GeminiProvider extends AiProvider {
  readonly models: readonly string[];
  private readonly client: GoogleGenAI;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.client = new GoogleGenAI({
      apiKey: config.get('GEMINI_API_KEY', { infer: true }),
      httpOptions: { timeout: CALL_TIMEOUT_MS },
    });
    const fallback = config.get('GEMINI_FALLBACK_MODEL', { infer: true });
    this.models = [config.get('GEMINI_MODEL', { infer: true }), ...(fallback ? [fallback] : [])];
  }

  async generateJson(request: AiProviderRequest): Promise<AiProviderResponse> {
    const parts: Part[] = [
      { text: request.prompt },
      ...request.attachments.map((file) => ({
        inlineData: { mimeType: file.mimeType, data: file.data.toString('base64') },
      })),
    ];

    try {
      const response = await this.client.models.generateContent({
        model: request.model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature,
          responseMimeType: 'application/json',
          responseJsonSchema: request.jsonSchema,
        },
      });
      const usage = response.usageMetadata;
      return {
        text: response.text ?? '',
        inputTokens: usage?.promptTokenCount ?? 0,
        // Token "suy nghĩ" tính tiền như token đầu ra
        outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
      };
    } catch (error) {
      if (error instanceof ApiError) throw new AiProviderError(error.message, error.status);
      throw new AiProviderError(error instanceof Error ? error.message : 'Lỗi không xác định');
    }
  }
}
