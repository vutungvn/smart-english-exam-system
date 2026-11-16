import type { AiProviderRequest, AiProviderResponse } from './ai.types.js';

/** Lỗi khi gọi model; status là mã HTTP Google trả về, không có khi quá thời gian chờ hoặc mất mạng */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * Nơi gọi model AI (D28, Mục 7.4). Nghiệp vụ không dùng trực tiếp mà đi qua AiGateway.
 * Dùng abstract class (không dùng interface) để làm token inject được trong Nest, giống StorageService
 */
export abstract class AiProvider {
  /** Các model thử lần lượt: model chính trước, model dự phòng sau */
  abstract readonly models: readonly string[];

  abstract generateJson(request: AiProviderRequest): Promise<AiProviderResponse>;
}
