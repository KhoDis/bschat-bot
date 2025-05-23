import { config, DotenvParseOutput } from "dotenv";
import { injectable } from "inversify";

@injectable()
export class ConfigService {
  private readonly config: DotenvParseOutput;

  constructor() {
    const { error, parsed } = config();

    if (error) {
      throw new Error("Could not find .env file");
    }
    if (!parsed) {
      throw new Error("File .env is empty");
    }

    this.config = parsed;
  }

  get(key: string): string {
    const res = this.config[key];

    if (!res) {
      throw new Error(`Key ${key} not found in .env file`);
    }

    return res;
  }
}
