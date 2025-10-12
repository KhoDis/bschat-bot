import { injectable } from 'inversify';

@injectable()
export class ActionCodec {
  encode(action: string, ...args: (string | number | bigint)[]): string {
    return [action, ...args.map(String)].join(':');
  }

  decode(data: string): { action: string; args: string[] } | null {
    if (!data) return null;
    const [action, ...args] = data.split(':');
    if (!action) return null;
    return { action, args };
  }
}
