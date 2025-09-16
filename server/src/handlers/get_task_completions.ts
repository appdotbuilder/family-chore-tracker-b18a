import { db } from '../db';
import { taskCompletionsTable, tasksTable, familyMembersTable } from '../db/schema';
import { type GetTaskCompletionsInput, type TaskCompletion } from '../schema';
import { eq, gte, lte, and, type SQL, desc } from 'drizzle-orm';

export async function getTaskCompletions(input: GetTaskCompletionsInput): Promise<TaskCompletion[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (input.task_id !== undefined) {
      conditions.push(eq(taskCompletionsTable.task_id, input.task_id));
    }

    if (input.family_member_id !== undefined) {
      conditions.push(eq(taskCompletionsTable.family_member_id, input.family_member_id));
    }

    if (input.date_from !== undefined) {
      conditions.push(gte(taskCompletionsTable.completed_at, input.date_from));
    }

    if (input.date_to !== undefined) {
      conditions.push(lte(taskCompletionsTable.completed_at, input.date_to));
    }

    // Build base query
    const baseQuery = db.select({
      // Task completion fields
      id: taskCompletionsTable.id,
      task_id: taskCompletionsTable.task_id,
      family_member_id: taskCompletionsTable.family_member_id,
      completed_at: taskCompletionsTable.completed_at,
      status: taskCompletionsTable.status,
      proof_image_url: taskCompletionsTable.proof_image_url,
      notes: taskCompletionsTable.notes,
      verified_by: taskCompletionsTable.verified_by,
      verified_at: taskCompletionsTable.verified_at,
      created_at: taskCompletionsTable.created_at,
    })
      .from(taskCompletionsTable)
      .innerJoin(tasksTable, eq(taskCompletionsTable.task_id, tasksTable.id))
      .innerJoin(familyMembersTable, eq(taskCompletionsTable.family_member_id, familyMembersTable.id));

    // Apply conditions and execute query
    const results = conditions.length > 0
      ? await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(taskCompletionsTable.completed_at))
          .execute()
      : await baseQuery
          .orderBy(desc(taskCompletionsTable.completed_at))
          .execute();

    // Map results to TaskCompletion type
    return results.map(result => ({
      id: result.id,
      task_id: result.task_id,
      family_member_id: result.family_member_id,
      completed_at: result.completed_at,
      status: result.status,
      proof_image_url: result.proof_image_url,
      notes: result.notes,
      verified_by: result.verified_by,
      verified_at: result.verified_at,
      created_at: result.created_at,
    }));
  } catch (error) {
    console.error('Failed to fetch task completions:', error);
    throw error;
  }
}