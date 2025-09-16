import { db } from '../db';
import { tasksTable, taskCompletionsTable } from '../db/schema';
import { type GetFamilyMemberTasksInput, type Task } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getFamilyMemberTasks(input: GetFamilyMemberTasksInput): Promise<Task[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by family member
    conditions.push(eq(tasksTable.assigned_to, input.family_member_id));
    
    // Optional task type filter
    if (input.task_type) {
      conditions.push(eq(tasksTable.task_type, input.task_type));
    }

    // Start with base query and apply where clause
    const query = db.select()
      .from(tasksTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    const results = await query.execute();

    // If status filter is provided, we need to filter based on completion status
    if (input.status) {
      const tasksWithStatus: Task[] = [];

      for (const task of results) {
        // Get the latest completion for this task by this family member
        const latestCompletion = await db.select()
          .from(taskCompletionsTable)
          .where(
            and(
              eq(taskCompletionsTable.task_id, task.id),
              eq(taskCompletionsTable.family_member_id, input.family_member_id)
            )
          )
          .orderBy(taskCompletionsTable.completed_at)
          .limit(1)
          .execute();

        // Determine task status based on completion
        let taskStatus: 'pending' | 'completed' | 'verified';
        if (latestCompletion.length === 0) {
          taskStatus = 'pending';
        } else {
          taskStatus = latestCompletion[0].status as 'pending' | 'completed' | 'verified';
        }

        // Include task if it matches the requested status
        if (taskStatus === input.status) {
          tasksWithStatus.push(task);
        }
      }

      return tasksWithStatus;
    }

    return results;
  } catch (error) {
    console.error('Failed to fetch family member tasks:', error);
    throw error;
  }
}