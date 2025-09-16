import { db } from '../db';
import { taskCompletionsTable, familyMembersTable } from '../db/schema';
import { type VerifyTaskCompletionInput, type TaskCompletion } from '../schema';
import { eq } from 'drizzle-orm';

export async function verifyTaskCompletion(input: VerifyTaskCompletionInput): Promise<TaskCompletion> {
  try {
    // First, verify that the completion record exists
    const existingCompletion = await db.select()
      .from(taskCompletionsTable)
      .where(eq(taskCompletionsTable.id, input.completion_id))
      .execute();

    if (existingCompletion.length === 0) {
      throw new Error(`Task completion with id ${input.completion_id} not found`);
    }

    // Verify that the verifier family member exists
    const verifier = await db.select()
      .from(familyMembersTable)
      .where(eq(familyMembersTable.id, input.verified_by))
      .execute();

    if (verifier.length === 0) {
      throw new Error(`Family member with id ${input.verified_by} not found`);
    }

    // Update the task completion with verification details
    const result = await db.update(taskCompletionsTable)
      .set({
        status: input.status,
        verified_by: input.verified_by,
        verified_at: new Date()
      })
      .where(eq(taskCompletionsTable.id, input.completion_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task completion verification failed:', error);
    throw error;
  }
}