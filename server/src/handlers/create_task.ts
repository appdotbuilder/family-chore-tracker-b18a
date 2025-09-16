import { db } from '../db';
import { tasksTable, streaksTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  try {
    // Insert task record
    const taskResult = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description || null,
        task_type: input.task_type,
        frequency: input.frequency,
        points: input.points,
        assigned_to: input.assigned_to,
        created_by: input.created_by,
        is_active: true
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Initialize streak record for the assigned family member
    await db.insert(streaksTable)
      .values({
        family_member_id: input.assigned_to,
        task_id: task.id,
        current_streak: 0,
        longest_streak: 0,
        last_completion_date: null
      })
      .execute();

    return task;
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};