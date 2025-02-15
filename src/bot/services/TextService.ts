import { getRandomResponse } from "@/config/botTemplates";

export class TextServiceError extends Error {}

// TODO: make it type-safe using zod and recursive types
// TODO: add nested templates (apple.banana)
// TODO: use proper template engine or i18n library
export class TextService {
  constructor() {
    // TODO
  }

  get(key: string[]): string {
    return getRandomResponse(key);
  }

  private getRandomResponse<T>(responses: T[]): T {
    return responses[Math.floor(Math.random() * responses.length)] as T;
  }
}
