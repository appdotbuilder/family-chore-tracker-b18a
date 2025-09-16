import { db } from '../db';
import { tasksTable, familyMembersTable, streaksTable } from '../db/schema';
import { type UpdateTaskInput, type Task } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateTask = async (input: UpdateTaskInput): Promise<Task> => {
  try {
    // First, get the current task to check if assigned_to is changing
    const currentTaskResults = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (currentTaskResults.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    const currentTask = currentTaskResults[0];

    // If assigned_to is changing, verify new assignee exists
    if (input.assigned_to !== undefined && input.assigned_to !== currentTask.assigned_to) {
      const newAssigneeResults = await db.select()
        .from(familyMembersTable)
        .where(eq(familyMembersTable.id, input.assigned_to))
        .execute();

      if (newAssigneeResults.length === 0) {
        throw new Error(`Family member with id ${input.assigned_to} not found`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.task_type !== undefined) updateData.task_type = input.task_type;
    if (input.frequency !== undefined) updateData.frequency = input.frequency;
    if (input.points !== undefined) updateData.points = input.points;
    if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    // Update the task
    const updatedTaskResults = await db.update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    const updatedTask = updatedTaskResults[0];

    // If the task was reassigned to a different family member, create a new streak record
    if (input.assigned_to !== undefined && input.assigned_to !== currentTask.assigned_to) {
      // Check if streak record already exists for new assignee and this task
      const existingStreakResults = await db.select()
        .from(streaksTable)
        .where(
          and(
            eq(streaksTable.family_member_id, input.assigned_to),
            eq(streaksTable.task_id, input.id)
          )
        )
        .execute();

      // Only create new streak if one doesn't already exist
      if (existingStreakResults.length === 0) {
        await db.insert(streaksTable)
          .values({
            family_member_id: input.assigned_to,
            task_id: input.id,
            current_streak: 0,
            longest_streak: 0,
            last_completion_date: null
          })
          .execute();
      }
    }

    return updatedTask;
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
};