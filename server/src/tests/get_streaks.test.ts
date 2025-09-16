import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable, tasksTable, streaksTable } from '../db/schema';
import { type GetStreaksInput } from '../schema';
import { getStreaks } from '../handlers/get_streaks';

describe('getStreaks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all streaks when no filters are provided', async () => {
    // Create test data
    const familyMember = await db.insert(familyMembersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    const task = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        task_type: 'habit',
        frequency: 'daily',
        points: 10,
        assigned_to: familyMember[0].id,
        created_by: familyMember[0].id
      })
      .returning()
      .execute();

    const streak1 = await db.insert(streaksTable)
      .values({
        family_member_id: familyMember[0].id,
        task_id: task[0].id,
        current_streak: 5,
        longest_streak: 10
      })
      .returning()
      .execute();

    const streak2 = await db.insert(streaksTable)
      .values({
        family_member_id: familyMember[0].id,
        task_id: task[0].id,
        current_streak: 3,
        longest_streak: 8
      })
      .returning()
      .execute();

    const input: GetStreaksInput = {};
    const result = await getStreaks(input);

    expect(result).toHaveLength(2);
    expect(result.some(s => s.id === streak1[0].id)).toBe(true);
    expect(result.some(s => s.id === streak2[0].id)).toBe(true);
  });

  it('should filter streaks by family_member_id', async () => {
    // Create two family members
    const familyMember1 = await db.insert(familyMembersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    const familyMember2 = await db.insert(familyMembersTable)
      .values({
        name: 'Jane Smith',
        email: 'jane@example.com'
      })
      .returning()
      .execute();

    // Create a task
    const task = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        task_type: 'habit',
        frequency: 'daily',
        points: 10,
        assigned_to: familyMember1[0].id,
        created_by: familyMember1[0].id
      })
      .returning()
      .execute();

    // Create streaks for both family members
    const streak1 = await db.insert(streaksTable)
      .values({
        family_member_id: familyMember1[0].id,
        task_id: task[0].id,
        current_streak: 5,
        longest_streak: 10
      })
      .returning()
      .execute();

    await db.insert(streaksTable)
      .values({
        family_member_id: familyMember2[0].id,
        task_id: task[0].id,
        current_streak: 3,
        longest_streak: 8
      })
      .returning()
      .execute();

    const input: GetStreaksInput = {
      family_member_id: familyMember1[0].id
    };
    const result = await getStreaks(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(streak1[0].id);
    expect(result[0].family_member_id).toEqual(familyMember1[0].id);
    expect(result[0].current_streak).toEqual(5);
    expect(result[0].longest_streak).toEqual(10);
  });

  it('should filter streaks by task_id', async () => {
    // Create family member
    const familyMember = await db.insert(familyMembersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    // Create two tasks
    const task1 = await db.insert(tasksTable)
      .values({
        title: 'Task 1',
        task_type: 'habit',
        frequency: 'daily',
        points: 10,
        assigned_to: familyMember[0].id,
        created_by: familyMember[0].id
      })
      .returning()
      .execute();

    const task2 = await db.insert(tasksTable)
      .values({
        title: 'Task 2',
        task_type: 'chore',
        frequency: 'weekly',
        points: 15,
        assigned_to: familyMember[0].id,
        created_by: familyMember[0].id
      })
      .returning()
      .execute();

    // Create streaks for both tasks
    const streak1 = await db.insert(streaksTable)
      .values({
        family_member_id: familyMember[0].id,
        task_id: task1[0].id,
        current_streak: 7,
        longest_streak: 12
      })
      .returning()
      .execute();

    await db.insert(streaksTable)
      .values({
        family_member_id: familyMember[0].id,
        task_id: task2[0].id,
        current_streak: 2,
        longest_streak: 5
      })
      .returning()
      .execute();

    const input: GetStreaksInput = {
      task_id: task1[0].id
    };
    const result = await getStreaks(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(streak1[0].id);
    expect(result[0].task_id).toEqual(task1[0].id);
    expect(result[0].current_streak).toEqual(7);
    expect(result[0].longest_streak).toEqual(12);
  });

  it('should filter streaks by both family_member_id and task_id', async () => {
    // Create two family members
    const familyMember1 = await db.insert(familyMembersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    const familyMember2 = await db.insert(familyMembersTable)
      .values({
        name: 'Jane Smith',
        email: 'jane@example.com'
      })
      .returning()
      .execute();

    // Create two tasks
    const task1 = await db.insert(tasksTable)
      .values({
        title: 'Task 1',
        task_type: 'habit',
        frequency: 'daily',
        points: 10,
        assigned_to: familyMember1[0].id,
        created_by: familyMember1[0].id
      })
      .returning()
      .execute();

    const task2 = await db.insert(tasksTable)
      .values({
        title: 'Task 2',
        task_type: 'chore',
        frequency: 'weekly',
        points: 15,
        assigned_to: familyMember1[0].id,
        created_by: familyMember1[0].id
      })
      .returning()
      .execute();

    // Create various streak combinations
    const targetStreak = await db.insert(streaksTable)
      .values({
        family_member_id: familyMember1[0].id,
        task_id: task1[0].id,
        current_streak: 9,
        longest_streak: 15
      })
      .returning()
      .execute();

    // Different family member, same task
    await db.insert(streaksTable)
      .values({
        family_member_id: familyMember2[0].id,
        task_id: task1[0].id,
        current_streak: 4,
        longest_streak: 6
      })
      .returning()
      .execute();

    // Same family member, different task
    await db.insert(streaksTable)
      .values({
        family_member_id: familyMember1[0].id,
        task_id: task2[0].id,
        current_streak: 2,
        longest_streak: 8
      })
      .returning()
      .execute();

    const input: GetStreaksInput = {
      family_member_id: familyMember1[0].id,
      task_id: task1[0].id
    };
    const result = await getStreaks(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(targetStreak[0].id);
    expect(result[0].family_member_id).toEqual(familyMember1[0].id);
    expect(result[0].task_id).toEqual(task1[0].id);
    expect(result[0].current_streak).toEqual(9);
    expect(result[0].longest_streak).toEqual(15);
  });

  it('should return empty array when no streaks match filters', async () => {
    // Create family member and task
    const familyMember = await db.insert(familyMembersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    const task = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        task_type: 'habit',
        frequency: 'daily',
        points: 10,
        assigned_to: familyMember[0].id,
        created_by: familyMember[0].id
      })
      .returning()
      .execute();

    // Create a streak
    await db.insert(streaksTable)
      .values({
        family_member_id: familyMember[0].id,
        task_id: task[0].id,
        current_streak: 5,
        longest_streak: 10
      })
      .returning()
      .execute();

    // Search for non-existent family member
    const input: GetStreaksInput = {
      family_member_id: 99999
    };
    const result = await getStreaks(input);

    expect(result).toHaveLength(0);
  });

  it('should handle streaks with null last_completion_date', async () => {
    // Create family member and task
    const familyMember = await db.insert(familyMembersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    const task = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        task_type: 'habit',
        frequency: 'daily',
        points: 10,
        assigned_to: familyMember[0].id,
        created_by: familyMember[0].id
      })
      .returning()
      .execute();

    // Create streak with null last_completion_date
    const streak = await db.insert(streaksTable)
      .values({
        family_member_id: familyMember[0].id,
        task_id: task[0].id,
        current_streak: 0,
        longest_streak: 0,
        last_completion_date: null
      })
      .returning()
      .execute();

    const input: GetStreaksInput = {};
    const result = await getStreaks(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(streak[0].id);
    expect(result[0].last_completion_date).toBeNull();
    expect(result[0].current_streak).toEqual(0);
    expect(result[0].longest_streak).toEqual(0);
  });

  it('should verify all streak fields are returned correctly', async () => {
    // Create family member and task
    const familyMember = await db.insert(familyMembersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    const task = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        task_type: 'habit',
        frequency: 'daily',
        points: 10,
        assigned_to: familyMember[0].id,
        created_by: familyMember[0].id
      })
      .returning()
      .execute();

    const completionDate = new Date('2024-01-15T10:00:00Z');
    
    const streak = await db.insert(streaksTable)
      .values({
        family_member_id: familyMember[0].id,
        task_id: task[0].id,
        current_streak: 14,
        longest_streak: 20,
        last_completion_date: completionDate
      })
      .returning()
      .execute();

    const input: GetStreaksInput = {};
    const result = await getStreaks(input);

    expect(result).toHaveLength(1);
    const returnedStreak = result[0];
    
    // Verify all fields
    expect(returnedStreak.id).toEqual(streak[0].id);
    expect(returnedStreak.family_member_id).toEqual(familyMember[0].id);
    expect(returnedStreak.task_id).toEqual(task[0].id);
    expect(returnedStreak.current_streak).toEqual(14);
    expect(returnedStreak.longest_streak).toEqual(20);
    expect(returnedStreak.last_completion_date).toEqual(completionDate);
    expect(returnedStreak.created_at).toBeInstanceOf(Date);
    expect(returnedStreak.updated_at).toBeInstanceOf(Date);
  });
});