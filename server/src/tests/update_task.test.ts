import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable, tasksTable, streaksTable } from '../db/schema';
import { type UpdateTaskInput, type CreateFamilyMemberInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq, and } from 'drizzle-orm';

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test family members
  const createTestFamilyMembers = async () => {
    const member1Input: CreateFamilyMemberInput = {
      name: 'John Doe',
      email: 'john@example.com',
      avatar_url: null
    };

    const member2Input: CreateFamilyMemberInput = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      avatar_url: null
    };

    const results = await db.insert(familyMembersTable)
      .values([member1Input, member2Input])
      .returning()
      .execute();

    return { member1: results[0], member2: results[1] };
  };

  // Helper to create test task
  const createTestTask = async (assignedToId: number, createdById: number) => {
    const taskData = {
      title: 'Test Task',
      description: 'A task for testing',
      task_type: 'chore' as const,
      frequency: 'daily' as const,
      points: 10,
      assigned_to: assignedToId,
      created_by: createdById,
      is_active: true
    };

    const results = await db.insert(tasksTable)
      .values(taskData)
      .returning()
      .execute();

    return results[0];
  };

  it('should update task title successfully', async () => {
    const { member1 } = await createTestFamilyMembers();
    const task = await createTestTask(member1.id, member1.id);

    const updateInput: UpdateTaskInput = {
      id: task.id,
      title: 'Updated Task Title'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(task.id);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual(task.description);
    expect(result.task_type).toEqual(task.task_type);
    expect(result.frequency).toEqual(task.frequency);
    expect(result.points).toEqual(task.points);
    expect(result.assigned_to).toEqual(task.assigned_to);
    expect(result.created_by).toEqual(task.created_by);
    expect(result.is_active).toEqual(task.is_active);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > task.updated_at).toBe(true);
  });

  it('should update multiple task fields simultaneously', async () => {
    const { member1 } = await createTestFamilyMembers();
    const task = await createTestTask(member1.id, member1.id);

    const updateInput: UpdateTaskInput = {
      id: task.id,
      title: 'Updated Task Title',
      description: 'Updated description',
      task_type: 'habit',
      frequency: 'weekly',
      points: 25,
      is_active: false
    };

    const result = await updateTask(updateInput);

    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Updated description');
    expect(result.task_type).toEqual('habit');
    expect(result.frequency).toEqual('weekly');
    expect(result.points).toEqual(25);
    expect(result.is_active).toBe(false);
  });

  it('should save updated task to database', async () => {
    const { member1 } = await createTestFamilyMembers();
    const task = await createTestTask(member1.id, member1.id);

    const updateInput: UpdateTaskInput = {
      id: task.id,
      title: 'Database Updated Title',
      points: 15
    };

    await updateTask(updateInput);

    // Query database to verify changes were persisted
    const dbTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(dbTasks).toHaveLength(1);
    expect(dbTasks[0].title).toEqual('Database Updated Title');
    expect(dbTasks[0].points).toEqual(15);
    expect(dbTasks[0].updated_at).toBeInstanceOf(Date);
    expect(dbTasks[0].updated_at > task.updated_at).toBe(true);
  });

  it('should reassign task to different family member and create streak record', async () => {
    const { member1, member2 } = await createTestFamilyMembers();
    const task = await createTestTask(member1.id, member1.id);

    const updateInput: UpdateTaskInput = {
      id: task.id,
      assigned_to: member2.id
    };

    const result = await updateTask(updateInput);

    expect(result.assigned_to).toEqual(member2.id);

    // Verify streak record was created for new assignee
    const streaks = await db.select()
      .from(streaksTable)
      .where(
        and(
          eq(streaksTable.family_member_id, member2.id),
          eq(streaksTable.task_id, task.id)
        )
      )
      .execute();

    expect(streaks).toHaveLength(1);
    expect(streaks[0].current_streak).toEqual(0);
    expect(streaks[0].longest_streak).toEqual(0);
    expect(streaks[0].last_completion_date).toBeNull();
  });

  it('should not create duplicate streak record when reassigning to same member twice', async () => {
    const { member1, member2 } = await createTestFamilyMembers();
    const task = await createTestTask(member1.id, member1.id);

    // First reassignment
    await updateTask({
      id: task.id,
      assigned_to: member2.id
    });

    // Second reassignment to same member
    await updateTask({
      id: task.id,
      assigned_to: member2.id
    });

    // Should still only have one streak record
    const streaks = await db.select()
      .from(streaksTable)
      .where(
        and(
          eq(streaksTable.family_member_id, member2.id),
          eq(streaksTable.task_id, task.id)
        )
      )
      .execute();

    expect(streaks).toHaveLength(1);
  });

  it('should not create streak record when assignment does not change', async () => {
    const { member1 } = await createTestFamilyMembers();
    const task = await createTestTask(member1.id, member1.id);

    const updateInput: UpdateTaskInput = {
      id: task.id,
      title: 'Updated Title'
    };

    await updateTask(updateInput);

    // Should not create any streak records since assignment didn't change
    const streaks = await db.select()
      .from(streaksTable)
      .where(eq(streaksTable.task_id, task.id))
      .execute();

    expect(streaks).toHaveLength(0);
  });

  it('should throw error when task does not exist', async () => {
    const updateInput: UpdateTaskInput = {
      id: 999,
      title: 'Non-existent task'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/task with id 999 not found/i);
  });

  it('should throw error when reassigning to non-existent family member', async () => {
    const { member1 } = await createTestFamilyMembers();
    const task = await createTestTask(member1.id, member1.id);

    const updateInput: UpdateTaskInput = {
      id: task.id,
      assigned_to: 999
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/family member with id 999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const { member1 } = await createTestFamilyMembers();
    const task = await createTestTask(member1.id, member1.id);

    // Update only description
    const updateInput: UpdateTaskInput = {
      id: task.id,
      description: 'Only description changed'
    };

    const result = await updateTask(updateInput);

    // All other fields should remain unchanged
    expect(result.title).toEqual(task.title);
    expect(result.description).toEqual('Only description changed');
    expect(result.task_type).toEqual(task.task_type);
    expect(result.frequency).toEqual(task.frequency);
    expect(result.points).toEqual(task.points);
    expect(result.assigned_to).toEqual(task.assigned_to);
    expect(result.is_active).toEqual(task.is_active);
  });

  it('should handle setting nullable fields to null', async () => {
    const { member1 } = await createTestFamilyMembers();
    const task = await createTestTask(member1.id, member1.id);

    const updateInput: UpdateTaskInput = {
      id: task.id,
      description: null
    };

    const result = await updateTask(updateInput);

    expect(result.description).toBeNull();
  });
});