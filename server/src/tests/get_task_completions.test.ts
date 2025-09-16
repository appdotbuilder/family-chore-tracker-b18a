import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable, tasksTable, taskCompletionsTable } from '../db/schema';
import { type GetTaskCompletionsInput } from '../schema';
import { getTaskCompletions } from '../handlers/get_task_completions';

// Test data setup
const createTestFamily = async () => {
  const familyMembers = await db.insert(familyMembersTable)
    .values([
      {
        name: 'John Parent',
        email: 'john@family.com',
        avatar_url: 'https://example.com/john.jpg'
      },
      {
        name: 'Jane Child',
        email: 'jane@family.com',
        avatar_url: null
      }
    ])
    .returning()
    .execute();

  const tasks = await db.insert(tasksTable)
    .values([
      {
        title: 'Clean Room',
        description: 'Clean your bedroom',
        task_type: 'chore',
        frequency: 'daily',
        points: 10,
        assigned_to: familyMembers[1].id, // Jane
        created_by: familyMembers[0].id, // John
        is_active: true
      },
      {
        title: 'Brush Teeth',
        description: 'Daily hygiene habit',
        task_type: 'habit',
        frequency: 'daily',
        points: 5,
        assigned_to: familyMembers[1].id, // Jane
        created_by: familyMembers[0].id, // John
        is_active: true
      }
    ])
    .returning()
    .execute();

  return { familyMembers, tasks };
};

describe('getTaskCompletions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all task completions when no filters applied', async () => {
    const { familyMembers, tasks } = await createTestFamily();

    // Create test completions
    const baseDate = new Date('2024-01-15T10:00:00Z');
    await db.insert(taskCompletionsTable)
      .values([
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: baseDate,
          status: 'completed',
          proof_image_url: 'https://example.com/proof1.jpg',
          notes: 'Room is clean'
        },
        {
          task_id: tasks[1].id,
          family_member_id: familyMembers[1].id,
          completed_at: new Date(baseDate.getTime() + 86400000), // +1 day
          status: 'verified',
          proof_image_url: null,
          notes: null,
          verified_by: familyMembers[0].id,
          verified_at: new Date(baseDate.getTime() + 90000000) // +25 hours
        }
      ])
      .execute();

    const input: GetTaskCompletionsInput = {};
    const result = await getTaskCompletions(input);

    expect(result).toHaveLength(2);
    // Results are ordered by completed_at DESC, so the later completion comes first
    expect(result[0].task_id).toEqual(tasks[1].id);
    expect(result[0].family_member_id).toEqual(familyMembers[1].id);
    expect(result[0].status).toEqual('verified');
    expect(result[0].verified_by).toEqual(familyMembers[0].id);
    expect(result[0].verified_at).toBeInstanceOf(Date);
    expect(result[0].proof_image_url).toBeNull();
    expect(result[0].notes).toBeNull();

    expect(result[1].task_id).toEqual(tasks[0].id);
    expect(result[1].status).toEqual('completed');
    expect(result[1].proof_image_url).toEqual('https://example.com/proof1.jpg');
    expect(result[1].notes).toEqual('Room is clean');
    expect(result[1].verified_by).toBeNull();
  });

  it('should filter by task_id', async () => {
    const { familyMembers, tasks } = await createTestFamily();

    // Create completions for both tasks
    await db.insert(taskCompletionsTable)
      .values([
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          status: 'completed'
        },
        {
          task_id: tasks[1].id,
          family_member_id: familyMembers[1].id,
          status: 'completed'
        }
      ])
      .execute();

    const input: GetTaskCompletionsInput = {
      task_id: tasks[0].id
    };
    const result = await getTaskCompletions(input);

    expect(result).toHaveLength(1);
    expect(result[0].task_id).toEqual(tasks[0].id);
  });

  it('should filter by family_member_id', async () => {
    const { familyMembers, tasks } = await createTestFamily();

    // Create additional family member
    const extraMember = await db.insert(familyMembersTable)
      .values({
        name: 'Bob Child',
        email: 'bob@family.com'
      })
      .returning()
      .execute();

    // Create completions for different family members
    await db.insert(taskCompletionsTable)
      .values([
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          status: 'completed'
        },
        {
          task_id: tasks[0].id,
          family_member_id: extraMember[0].id,
          status: 'completed'
        }
      ])
      .execute();

    const input: GetTaskCompletionsInput = {
      family_member_id: familyMembers[1].id
    };
    const result = await getTaskCompletions(input);

    expect(result).toHaveLength(1);
    expect(result[0].family_member_id).toEqual(familyMembers[1].id);
  });

  it('should filter by date range', async () => {
    const { familyMembers, tasks } = await createTestFamily();

    const date1 = new Date('2024-01-10T10:00:00Z');
    const date2 = new Date('2024-01-15T10:00:00Z');
    const date3 = new Date('2024-01-20T10:00:00Z');

    // Create completions on different dates
    await db.insert(taskCompletionsTable)
      .values([
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: date1,
          status: 'completed'
        },
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: date2,
          status: 'completed'
        },
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: date3,
          status: 'completed'
        }
      ])
      .execute();

    const input: GetTaskCompletionsInput = {
      date_from: new Date('2024-01-12T00:00:00Z'),
      date_to: new Date('2024-01-18T00:00:00Z')
    };
    const result = await getTaskCompletions(input);

    expect(result).toHaveLength(1);
    expect(result[0].completed_at).toEqual(date2);
  });

  it('should handle date_from filter only', async () => {
    const { familyMembers, tasks } = await createTestFamily();

    const oldDate = new Date('2024-01-10T10:00:00Z');
    const newDate = new Date('2024-01-20T10:00:00Z');

    await db.insert(taskCompletionsTable)
      .values([
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: oldDate,
          status: 'completed'
        },
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: newDate,
          status: 'completed'
        }
      ])
      .execute();

    const input: GetTaskCompletionsInput = {
      date_from: new Date('2024-01-15T00:00:00Z')
    };
    const result = await getTaskCompletions(input);

    expect(result).toHaveLength(1);
    expect(result[0].completed_at).toEqual(newDate);
  });

  it('should handle date_to filter only', async () => {
    const { familyMembers, tasks } = await createTestFamily();

    const oldDate = new Date('2024-01-10T10:00:00Z');
    const newDate = new Date('2024-01-20T10:00:00Z');

    await db.insert(taskCompletionsTable)
      .values([
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: oldDate,
          status: 'completed'
        },
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: newDate,
          status: 'completed'
        }
      ])
      .execute();

    const input: GetTaskCompletionsInput = {
      date_to: new Date('2024-01-15T00:00:00Z')
    };
    const result = await getTaskCompletions(input);

    expect(result).toHaveLength(1);
    expect(result[0].completed_at).toEqual(oldDate);
  });

  it('should combine multiple filters', async () => {
    const { familyMembers, tasks } = await createTestFamily();

    // Create additional family member
    const extraMember = await db.insert(familyMembersTable)
      .values({
        name: 'Bob Child',
        email: 'bob@family.com'
      })
      .returning()
      .execute();

    const targetDate = new Date('2024-01-15T10:00:00Z');
    const otherDate = new Date('2024-01-10T10:00:00Z');

    await db.insert(taskCompletionsTable)
      .values([
        // Matches all filters
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: targetDate,
          status: 'completed'
        },
        // Wrong task
        {
          task_id: tasks[1].id,
          family_member_id: familyMembers[1].id,
          completed_at: targetDate,
          status: 'completed'
        },
        // Wrong family member
        {
          task_id: tasks[0].id,
          family_member_id: extraMember[0].id,
          completed_at: targetDate,
          status: 'completed'
        },
        // Wrong date
        {
          task_id: tasks[0].id,
          family_member_id: familyMembers[1].id,
          completed_at: otherDate,
          status: 'completed'
        }
      ])
      .execute();

    const input: GetTaskCompletionsInput = {
      task_id: tasks[0].id,
      family_member_id: familyMembers[1].id,
      date_from: new Date('2024-01-12T00:00:00Z'),
      date_to: new Date('2024-01-18T00:00:00Z')
    };
    const result = await getTaskCompletions(input);

    expect(result).toHaveLength(1);
    expect(result[0].task_id).toEqual(tasks[0].id);
    expect(result[0].family_member_id).toEqual(familyMembers[1].id);
    expect(result[0].completed_at).toEqual(targetDate);
  });

  it('should return empty array when no completions match filters', async () => {
    const { familyMembers, tasks } = await createTestFamily();

    await db.insert(taskCompletionsTable)
      .values({
        task_id: tasks[0].id,
        family_member_id: familyMembers[1].id,
        completed_at: new Date('2024-01-15T10:00:00Z'),
        status: 'completed'
      })
      .execute();

    const input: GetTaskCompletionsInput = {
      task_id: 999, // Non-existent task
    };
    const result = await getTaskCompletions(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no task completions exist', async () => {
    await createTestFamily(); // Create family but no completions

    const input: GetTaskCompletionsInput = {};
    const result = await getTaskCompletions(input);

    expect(result).toHaveLength(0);
  });
});