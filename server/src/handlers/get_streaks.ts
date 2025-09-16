import { db } from '../db';
import { streaksTable } from '../db/schema';
import { type GetStreaksInput, type Streak } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getStreaks(input: GetStreaksInput): Promise<Streak[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (input.family_member_id !== undefined) {
      conditions.push(eq(streaksTable.family_member_id, input.family_member_id));
    }

    if (input.task_id !== undefined) {
      conditions.push(eq(streaksTable.task_id, input.task_id));
    }

    // Build query with optional where clause
    const query = conditions.length > 0
      ? db.select().from(streaksTable).where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : db.select().from(streaksTable);

    const results = await query.execute();

    return results;
  } catch (error) {
    console.error('Get streaks failed:', error);
    throw error;
  }
}