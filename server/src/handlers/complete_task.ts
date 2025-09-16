import { db } from '../db';
import { taskCompletionsTable, streaksTable, tasksTable, familyMembersTable } from '../db/schema';
import { type CreateTaskCompletionInput, type TaskCompletion } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const completeTask = async (input: CreateTaskCompletionInput): Promise<TaskCompletion> => {
  try {
    // Verify task and family member exist
    const [task, familyMember] = await Promise.all([
      db.select().from(tasksTable).where(eq(tasksTable.id, input.task_id)).execute(),
      db.select().from(familyMembersTable).where(eq(familyMembersTable.id, input.family_member_id)).execute()
    ]);

    if (task.length === 0) {
      throw new Error(`Task with id ${input.task_id} not found`);
    }

    if (familyMember.length === 0) {
      throw new Error(`Family member with id ${input.family_member_id} not found`);
    }

    // Create task completion record
    const completionResult = await db.insert(taskCompletionsTable)
      .values({
        task_id: input.task_id,
        family_member_id: input.family_member_id,
        proof_image_url: input.proof_image_url || null,
        notes: input.notes || null
      })
      .returning()
      .execute();

    const completion = completionResult[0];

    // Update or create streak record
    await updateStreak(input.task_id, input.family_member_id, completion.completed_at);

    return completion;
  } catch (error) {
    console.error('Task completion failed:', error);
    throw error;
  }
};

async function updateStreak(taskId: number, familyMemberId: number, completedAt: Date) {
  // Find existing streak record
  const existingStreak = await db.select()
    .from(streaksTable)
    .where(and(
      eq(streaksTable.task_id, taskId),
      eq(streaksTable.family_member_id, familyMemberId)
    ))
    .execute();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const completedDate = new Date(completedAt);
  completedDate.setHours(0, 0, 0, 0);

  if (existingStreak.length === 0) {
    // Create new streak record
    await db.insert(streaksTable)
      .values({
        family_member_id: familyMemberId,
        task_id: taskId,
        current_streak: 1,
        longest_streak: 1,
        last_completion_date: completedAt
      })
      .execute();
  } else {
    const streak = existingStreak[0];
    const lastCompletionDate = streak.last_completion_date ? new Date(streak.last_completion_date) : null;
    
    let newCurrentStreak = 1;
    
    if (lastCompletionDate) {
      lastCompletionDate.setHours(0, 0, 0, 0);
      
      // Calculate days between last completion and current completion
      const daysDiff = Math.floor((completedDate.getTime() - lastCompletionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day - increment streak
        newCurrentStreak = streak.current_streak + 1;
      } else if (daysDiff === 0) {
        // Same day - keep current streak
        newCurrentStreak = streak.current_streak;
      }
      // If daysDiff > 1, streak resets to 1 (already set above)
    }

    const newLongestStreak = Math.max(streak.longest_streak, newCurrentStreak);

    // Update streak record
    await db.update(streaksTable)
      .set({
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_completion_date: completedAt,
        updated_at: new Date()
      })
      .where(eq(streaksTable.id, streak.id))
      .execute();
  }
}