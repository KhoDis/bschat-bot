import { config } from 'dotenv';
import { injectable } from 'inversify';

@injectable()
export class ConfigService {
  constructor() {
    // Load .env if present; ignore absence in production environments
    try {
      config();
    } catch {
      // noop: treat .env as optional
    }
  }

  get(key: string): string {
    const value = process.env[key];
    if (value === undefined || value === '') {
      throw new Error(`Environment variable ${key} is required`);
    }
    return value;
  }

  getOptional(key: string): string | undefined {
    const value = process.env[key];
    return value === undefined || value === '' ? undefined : value;
  }

  require(keys: string[]): void {
    const missing: string[] = [];
    for (const key of keys) {
      const value = process.env[key];
      if (value === undefined || value === '') {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}
