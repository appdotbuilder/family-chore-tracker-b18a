import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable, tasksTable, taskCompletionsTable, streaksTable } from '../db/schema';
import { type CreateTaskCompletionInput } from '../schema';
import { completeTask } from '../handlers/complete_task';
import { eq, and } from 'drizzle-orm';

// Test data setup
async function setupTestData() {
  // Create test family member
  const familyMemberResult = await db.insert(familyMembersTable)
    .values({
      name: 'Test User',
      email: 'test@example.com'
    })
    .returning()
    .execute();

  // Create test task
  const taskResult = await db.insert(tasksTable)
    .values({
      title: 'Daily Exercise',
      task_type: 'habit',
      frequency: 'daily',
      points: 10,
      assigned_to: familyMemberResult[0].id,
      created_by: familyMemberResult[0].id
    })
    .returning()
    .execute();

  return {
    familyMember: familyMemberResult[0],
    task: taskResult[0]
  };
}

describe('completeTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task completion record', async () => {
    const { familyMember, task } = await setupTestData();

    const input: CreateTaskCompletionInput = {
      task_id: task.id,
      family_member_id: familyMember.id,
      proof_image_url: 'https://example.com/proof.jpg',
      notes: 'Completed morning workout'
    };

    const result = await completeTask(input);

    // Verify completion record
    expect(result.task_id).toEqual(task.id);
    expect(result.family_member_id).toEqual(familyMember.id);
    expect(result.status).toEqual('completed');
    expect(result.proof_image_url).toEqual('https://example.com/proof.jpg');
    expect(result.notes).toEqual('Completed morning workout');
    expect(result.id).toBeDefined();
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.verified_by).toBeNull();
    expect(result.verified_at).toBeNull();
  });

  it('should save completion to database', async () => {
    const { familyMember, task } = await setupTestData();

    const input: CreateTaskCompletionInput = {
      task_id: task.id,
      family_member_id: familyMember.id
    };

    const result = await completeTask(input);

    // Query database to verify record was saved
    const completions = await db.select()
      .from(taskCompletionsTable)
      .where(eq(taskCompletionsTable.id, result.id))
      .execute();

    expect(completions).toHaveLength(1);
    expect(completions[0].task_id).toEqual(task.id);
    expect(completions[0].family_member_id).toEqual(familyMember.id);
    expect(completions[0].status).toEqual('completed');
  });

  it('should create initial streak record for first completion', async () => {
    const { familyMember, task } = await setupTestData();

    const input: CreateTaskCompletionInput = {
      task_id: task.id,
      family_member_id: familyMember.id
    };

    await completeTask(input);

    // Verify streak record was created
    const streaks = await db.select()
      .from(streaksTable)
      .where(and(
        eq(streaksTable.task_id, task.id),
        eq(streaksTable.family_member_id, familyMember.id)
      ))
      .execute();

    expect(streaks).toHaveLength(1);
    expect(streaks[0].current_streak).toEqual(1);
    expect(streaks[0].longest_streak).toEqual(1);
    expect(streaks[0].last_completion_date).toBeInstanceOf(Date);
  });

  it('should increment streak for consecutive day completion', async () => {
    const { familyMember, task } = await setupTestData();

    // First completion
    await completeTask({
      task_id: task.id,
      family_member_id: familyMember.id
    });

    // Get the streak record and set last completion to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.update(streaksTable)
      .set({ 
        last_completion_date: yesterday,
        updated_at: new Date()
      })
      .where(and(
        eq(streaksTable.task_id, task.id),
        eq(streaksTable.family_member_id, familyMember.id)
      ))
      .execute();

    // Second completion (today)
    await completeTask({
      task_id: task.id,
      family_member_id: familyMember.id
    });

    // Verify streak was incremented
    const streaks = await db.select()
      .from(streaksTable)
      .where(and(
        eq(streaksTable.task_id, task.id),
        eq(streaksTable.family_member_id, familyMember.id)
      ))
      .execute();

    expect(streaks[0].current_streak).toEqual(2);
    expect(streaks[0].longest_streak).toEqual(2);
  });

  it('should reset streak for non-consecutive completion', async () => {
    const { familyMember, task } = await setupTestData();

    // First completion
    await completeTask({
      task_id: task.id,
      family_member_id: familyMember.id
    });

    // Set last completion to 3 days ago (breaking streak)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    await db.update(streaksTable)
      .set({ 
        current_streak: 5,
        longest_streak: 5,
        last_completion_date: threeDaysAgo,
        updated_at: new Date()
      })
      .where(and(
        eq(streaksTable.task_id, task.id),
        eq(streaksTable.family_member_id, familyMember.id)
      ))
      .execute();

    // Second completion (today - breaks streak)
    await completeTask({
      task_id: task.id,
      family_member_id: familyMember.id
    });

    // Verify streak was reset but longest streak preserved
    const streaks = await db.select()
      .from(streaksTable)
      .where(and(
        eq(streaksTable.task_id, task.id),
        eq(streaksTable.family_member_id, familyMember.id)
      ))
      .execute();

    expect(streaks[0].current_streak).toEqual(1);
    expect(streaks[0].longest_streak).toEqual(5); // Preserved
  });

  it('should maintain streak for same day completion', async () => {
    const { familyMember, task } = await setupTestData();

    // First completion
    await completeTask({
      task_id: task.id,
      family_member_id: familyMember.id
    });

    // Second completion same day
    await completeTask({
      task_id: task.id,
      family_member_id: familyMember.id
    });

    // Verify streak remained the same
    const completions = await db.select()
      .from(taskCompletionsTable)
      .where(and(
        eq(taskCompletionsTable.task_id, task.id),
        eq(taskCompletionsTable.family_member_id, familyMember.id)
      ))
      .execute();

    const streaks = await db.select()
      .from(streaksTable)
      .where(and(
        eq(streaksTable.task_id, task.id),
        eq(streaksTable.family_member_id, familyMember.id)
      ))
      .execute();

    expect(completions).toHaveLength(2); // Two completions recorded
    expect(streaks[0].current_streak).toEqual(1); // Streak unchanged for same day
    expect(streaks[0].longest_streak).toEqual(1);
  });

  it('should handle completion with minimal input', async () => {
    const { familyMember, task } = await setupTestData();

    const input: CreateTaskCompletionInput = {
      task_id: task.id,
      family_member_id: familyMember.id
    };

    const result = await completeTask(input);

    expect(result.proof_image_url).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.task_id).toEqual(task.id);
    expect(result.family_member_id).toEqual(familyMember.id);
  });

  it('should throw error for non-existent task', async () => {
    const { familyMember } = await setupTestData();

    const input: CreateTaskCompletionInput = {
      task_id: 99999, // Non-existent task
      family_member_id: familyMember.id
    };

    await expect(completeTask(input)).rejects.toThrow(/Task with id 99999 not found/i);
  });

  it('should throw error for non-existent family member', async () => {
    const { task } = await setupTestData();

    const input: CreateTaskCompletionInput = {
      task_id: task.id,
      family_member_id: 99999 // Non-existent family member
    };

    await expect(completeTask(input)).rejects.toThrow(/Family member with id 99999 not found/i);
  });

  it('should update longest streak when current streak exceeds it', async () => {
    const { familyMember, task } = await setupTestData();

    // Create initial streak with longest_streak = 3
    await db.insert(streaksTable)
      .values({
        family_member_id: familyMember.id,
        task_id: task.id,
        current_streak: 3,
        longest_streak: 3,
        last_completion_date: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      })
      .execute();

    // Complete task today (should make current_streak = 4)
    await completeTask({
      task_id: task.id,
      family_member_id: familyMember.id
    });

    const streaks = await db.select()
      .from(streaksTable)
      .where(and(
        eq(streaksTable.task_id, task.id),
        eq(streaksTable.family_member_id, familyMember.id)
      ))
      .execute();

    expect(streaks[0].current_streak).toEqual(4);
    expect(streaks[0].longest_streak).toEqual(4); // Updated to new high
  });
});