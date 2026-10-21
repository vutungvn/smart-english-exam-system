import { AiProvider } from './ai-provider.js';
import type { AiProviderRequest, AiProviderResponse } from './ai.types.js';

export const FAKE_MODEL = 'fake';

/** Dùng khi chưa có GEMINI_API_KEY và khi chạy test: trả kết quả mẫu của từng tính năng, không gọi Google */
export class FakeAiProvider extends AiProvider {
  readonly models = [FAKE_MODEL];

  generateJson(request: AiProviderRequest): Promise<AiProviderResponse> {
    return Promise.resolve({
      text: JSON.stringify(request.fake()),
      inputTokens: 0,
      outputTokens: 0,
    });
  }
}
