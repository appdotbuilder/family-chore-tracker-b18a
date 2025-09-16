import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, familyMembersTable, streaksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test family members first
  let assigneeId: number;
  let creatorId: number;

  beforeEach(async () => {
    // Create test family members
    const members = await db.insert(familyMembersTable)
      .values([
        {
          name: 'John Doe',
          email: 'john@example.com',
          avatar_url: null
        },
        {
          name: 'Jane Doe',
          email: 'jane@example.com',
          avatar_url: null
        }
      ])
      .returning()
      .execute();

    assigneeId = members[0].id;
    creatorId = members[1].id;
  });

  const getTestInput = (): CreateTaskInput => ({
    title: 'Clean Room',
    description: 'Clean and organize bedroom',
    task_type: 'chore',
    frequency: 'weekly',
    points: 10,
    assigned_to: assigneeId,
    created_by: creatorId
  });

  it('should create a task with all fields', async () => {
    const input = getTestInput();
    const result = await createTask(input);

    // Verify all task fields
    expect(result.title).toEqual('Clean Room');
    expect(result.description).toEqual('Clean and organize bedroom');
    expect(result.task_type).toEqual('chore');
    expect(result.frequency).toEqual('weekly');
    expect(result.points).toEqual(10);
    expect(result.assigned_to).toEqual(assigneeId);
    expect(result.created_by).toEqual(creatorId);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with minimal fields (description optional)', async () => {
    const input: CreateTaskInput = {
      title: 'Take Out Trash',
      task_type: 'daily',
      frequency: 'daily',
      points: 5,
      assigned_to: assigneeId,
      created_by: creatorId
    };

    const result = await createTask(input);

    expect(result.title).toEqual('Take Out Trash');
    expect(result.description).toBeNull();
    expect(result.task_type).toEqual('daily');
    expect(result.frequency).toEqual('daily');
    expect(result.points).toEqual(5);
    expect(result.assigned_to).toEqual(assigneeId);
    expect(result.created_by).toEqual(creatorId);
    expect(result.is_active).toEqual(true);
  });

  it('should save task to database', async () => {
    const input = getTestInput();
    const result = await createTask(input);

    // Query database to verify task was saved
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Clean Room');
    expect(tasks[0].description).toEqual('Clean and organize bedroom');
    expect(tasks[0].task_type).toEqual('chore');
    expect(tasks[0].frequency).toEqual('weekly');
    expect(tasks[0].points).toEqual(10);
    expect(tasks[0].assigned_to).toEqual(assigneeId);
    expect(tasks[0].created_by).toEqual(creatorId);
    expect(tasks[0].is_active).toEqual(true);
  });

  it('should initialize streak record for assigned family member', async () => {
    const input = getTestInput();
    const result = await createTask(input);

    // Query streak records for this task and family member
    const streaks = await db.select()
      .from(streaksTable)
      .where(eq(streaksTable.task_id, result.id))
      .execute();

    expect(streaks).toHaveLength(1);
    expect(streaks[0].family_member_id).toEqual(assigneeId);
    expect(streaks[0].task_id).toEqual(result.id);
    expect(streaks[0].current_streak).toEqual(0);
    expect(streaks[0].longest_streak).toEqual(0);
    expect(streaks[0].last_completion_date).toBeNull();
    expect(streaks[0].created_at).toBeInstanceOf(Date);
    expect(streaks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different task types and frequencies', async () => {
    const testCases = [
      { task_type: 'habit' as const, frequency: 'daily' as const, points: 3 },
      { task_type: 'weekly' as const, frequency: 'weekly' as const, points: 15 },
      { task_type: 'chore' as const, frequency: 'monthly' as const, points: 25 }
    ];

    for (const testCase of testCases) {
      const input: CreateTaskInput = {
        title: `Test ${testCase.task_type}`,
        task_type: testCase.task_type,
        frequency: testCase.frequency,
        points: testCase.points,
        assigned_to: assigneeId,
        created_by: creatorId
      };

      const result = await createTask(input);

      expect(result.task_type).toEqual(testCase.task_type);
      expect(result.frequency).toEqual(testCase.frequency);
      expect(result.points).toEqual(testCase.points);

      // Verify streak was created
      const streaks = await db.select()
        .from(streaksTable)
        .where(eq(streaksTable.task_id, result.id))
        .execute();

      expect(streaks).toHaveLength(1);
    }
  });

  it('should create multiple tasks for same family member', async () => {
    const input1: CreateTaskInput = {
      title: 'Task 1',
      task_type: 'chore',
      frequency: 'daily',
      points: 5,
      assigned_to: assigneeId,
      created_by: creatorId
    };

    const input2: CreateTaskInput = {
      title: 'Task 2',
      task_type: 'habit',
      frequency: 'weekly',
      points: 10,
      assigned_to: assigneeId,
      created_by: creatorId
    };

    const result1 = await createTask(input1);
    const result2 = await createTask(input2);

    // Verify both tasks are different
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('Task 1');
    expect(result2.title).toEqual('Task 2');

    // Verify both streak records were created
    const streaks = await db.select()
      .from(streaksTable)
      .execute();

    const task1Streaks = streaks.filter(s => s.task_id === result1.id);
    const task2Streaks = streaks.filter(s => s.task_id === result2.id);

    expect(task1Streaks).toHaveLength(1);
    expect(task2Streaks).toHaveLength(1);
    expect(task1Streaks[0].family_member_id).toEqual(assigneeId);
    expect(task2Streaks[0].family_member_id).toEqual(assigneeId);
  });
});