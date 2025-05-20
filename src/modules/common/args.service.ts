import { injectable } from "inversify";

@injectable()
export class ArgsService {
  /**
   * Parses command arguments, supporting quoted strings.
   * Example input: '/command "arg with spaces" simpleArg'
   * Returns: ['command', 'arg with spaces', 'simpleArg']
   */
  parse(text: string): string[] {
    const args: string[] = [];
    let current = "";
    let inQuotes = false;

    // Trim leading slash or any prefix if needed
    const trimmedText = text.trim();

    for (const char of trimmedText) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === " " && !inQuotes) {
        if (current) {
          args.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }
    if (current) args.push(current);

    return args;
  }
}
