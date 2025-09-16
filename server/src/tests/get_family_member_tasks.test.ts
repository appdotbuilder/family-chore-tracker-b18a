import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable, tasksTable, taskCompletionsTable } from '../db/schema';
import { type GetFamilyMemberTasksInput } from '../schema';
import { getFamilyMemberTasks } from '../handlers/get_family_member_tasks';
import { eq } from 'drizzle-orm';

describe('getFamilyMemberTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let familyMemberId1: number;
  let familyMemberId2: number;
  let taskId1: number;
  let taskId2: number;
  let taskId3: number;

  beforeEach(async () => {
    // Create test family members
    const familyMembers = await db.insert(familyMembersTable)
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

    familyMemberId1 = familyMembers[0].id;
    familyMemberId2 = familyMembers[1].id;

    // Create test tasks
    const tasks = await db.insert(tasksTable)
      .values([
        {
          title: 'Daily Exercise',
          description: 'Go for a 30 minute walk',
          task_type: 'daily',
          frequency: 'daily',
          points: 10,
          assigned_to: familyMemberId1,
          created_by: familyMemberId1,
          is_active: true
        },
        {
          title: 'Weekly Chores',
          description: 'Clean the house',
          task_type: 'chore',
          frequency: 'weekly',
          points: 25,
          assigned_to: familyMemberId1,
          created_by: familyMemberId2,
          is_active: true
        },
        {
          title: 'Habit Building',
          description: 'Read for 20 minutes',
          task_type: 'habit',
          frequency: 'daily',
          points: 15,
          assigned_to: familyMemberId2,
          created_by: familyMemberId1,
          is_active: true
        }
      ])
      .returning()
      .execute();

    taskId1 = tasks[0].id;
    taskId2 = tasks[1].id;
    taskId3 = tasks[2].id;
  });

  it('should fetch all tasks assigned to a family member', async () => {
    const input: GetFamilyMemberTasksInput = {
      family_member_id: familyMemberId1
    };

    const result = await getFamilyMemberTasks(input);

    expect(result).toHaveLength(2);
    expect(result.map(t => t.title).sort()).toEqual(['Daily Exercise', 'Weekly Chores']);
    
    // Verify all tasks belong to the correct family member
    result.forEach(task => {
      expect(task.assigned_to).toEqual(familyMemberId1);
    });
  });

  it('should filter tasks by task type', async () => {
    const input: GetFamilyMemberTasksInput = {
      family_member_id: familyMemberId1,
      task_type: 'daily'
    };

    const result = await getFamilyMemberTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Daily Exercise');
    expect(result[0].task_type).toEqual('daily');
    expect(result[0].assigned_to).toEqual(familyMemberId1);
  });

  it('should return empty array for family member with no tasks', async () => {
    // Create a new family member with no assigned tasks
    const [newMember] = await db.insert(familyMembersTable)
      .values({
        name: 'Bob Smith',
        email: 'bob@example.com',
        avatar_url: null
      })
      .returning()
      .execute();

    const input: GetFamilyMemberTasksInput = {
      family_member_id: newMember.id
    };

    const result = await getFamilyMemberTasks(input);

    expect(result).toHaveLength(0);
  });

  it('should filter tasks by completion status - pending tasks', async () => {
    const input: GetFamilyMemberTasksInput = {
      family_member_id: familyMemberId1,
      status: 'pending'
    };

    const result = await getFamilyMemberTasks(input);

    // Both tasks should be pending (no completions recorded)
    expect(result).toHaveLength(2);
    expect(result.map(t => t.title).sort()).toEqual(['Daily Exercise', 'Weekly Chores']);
  });

  it('should filter tasks by completion status - completed tasks', async () => {
    // Create a completion for one task
    await db.insert(taskCompletionsTable)
      .values({
        task_id: taskId1,
        family_member_id: familyMemberId1,
        status: 'completed',
        proof_image_url: null,
        notes: 'Finished the exercise'
      })
      .execute();

    const input: GetFamilyMemberTasksInput = {
      family_member_id: familyMemberId1,
      status: 'completed'
    };

    const result = await getFamilyMemberTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Daily Exercise');
  });

  it('should filter tasks by completion status - verified tasks', async () => {
    // Create a verified completion
    await db.insert(taskCompletionsTable)
      .values({
        task_id: taskId2,
        family_member_id: familyMemberId1,
        status: 'verified',
        proof_image_url: null,
        notes: 'House cleaning verified',
        verified_by: familyMemberId2,
        verified_at: new Date()
      })
      .execute();

    const input: GetFamilyMemberTasksInput = {
      family_member_id: familyMemberId1,
      status: 'verified'
    };

    const result = await getFamilyMemberTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Weekly Chores');
  });

  it('should combine task type and status filters', async () => {
    // Create completions for both tasks
    await db.insert(taskCompletionsTable)
      .values([
        {
          task_id: taskId1,
          family_member_id: familyMemberId1,
          status: 'completed',
          proof_image_url: null,
          notes: null
        },
        {
          task_id: taskId2,
          family_member_id: familyMemberId1,
          status: 'completed',
          proof_image_url: null,
          notes: null
        }
      ])
      .execute();

    const input: GetFamilyMemberTasksInput = {
      family_member_id: familyMemberId1,
      task_type: 'daily',
      status: 'completed'
    };

    const result = await getFamilyMemberTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Daily Exercise');
    expect(result[0].task_type).toEqual('daily');
  });

  it('should return empty array when no tasks match combined filters', async () => {
    const input: GetFamilyMemberTasksInput = {
      family_member_id: familyMemberId1,
      task_type: 'habit',
      status: 'completed'
    };

    const result = await getFamilyMemberTasks(input);

    expect(result).toHaveLength(0);
  });

  it('should handle inactive tasks correctly', async () => {
    // Make one task inactive
    await db.update(tasksTable)
      .set({ is_active: false })
      .where(eq(tasksTable.id, taskId1))
      .execute();

    const input: GetFamilyMemberTasksInput = {
      family_member_id: familyMemberId1
    };

    const result = await getFamilyMemberTasks(input);

    // Should return both active and inactive tasks (no filter for is_active)
    expect(result).toHaveLength(2);
    
    const inactiveTask = result.find(t => t.id === taskId1);
    expect(inactiveTask?.is_active).toBe(false);
  });
});