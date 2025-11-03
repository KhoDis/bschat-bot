import { Composer } from 'telegraf';
import { IBotContext } from '@/context/context.interface';
import { injectable } from 'inversify';

/**
 * MemberModule - Handles member-related functionality
 *
 * Note: Membership is now automatically synced via middleware in app.ts
 * No manual commands needed - users are registered on their first message
 */
@injectable()
export class MemberModule extends Composer<IBotContext> {
  constructor() {
    super();
    // Previously had /joinbs command - now auto-synced via middleware
  }
}
