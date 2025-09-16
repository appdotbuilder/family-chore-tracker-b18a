import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable, tasksTable } from '../db/schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();
    
    expect(result).toEqual([]);
  });

  it('should return all active tasks', async () => {
    // Create family members first (required for foreign keys)
    const memberResults = await db.insert(familyMembersTable)
      .values([
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ])
      .returning()
      .execute();

    const john = memberResults[0];
    const jane = memberResults[1];

    // Create test tasks
    await db.insert(tasksTable)
      .values([
        {
          title: 'Clean Room',
          description: 'Clean and organize bedroom',
          task_type: 'chore',
          frequency: 'weekly',
          points: 10,
          assigned_to: john.id,
          created_by: jane.id,
          is_active: true
        },
        {
          title: 'Take Vitamins',
          description: null,
          task_type: 'habit',
          frequency: 'daily',
          points: 5,
          assigned_to: jane.id,
          created_by: john.id,
          is_active: true
        },
        {
          title: 'Inactive Task',
          description: 'This task is inactive',
          task_type: 'daily',
          frequency: 'daily',
          points: 3,
          assigned_to: john.id,
          created_by: jane.id,
          is_active: false // Inactive task - should not be returned
        }
      ])
      .execute();

    const result = await getTasks();

    // Should only return active tasks
    expect(result).toHaveLength(2);
    
    // Check first task
    const cleanRoomTask = result.find(task => task.title === 'Clean Room');
    expect(cleanRoomTask).toBeDefined();
    expect(cleanRoomTask!.description).toEqual('Clean and organize bedroom');
    expect(cleanRoomTask!.task_type).toEqual('chore');
    expect(cleanRoomTask!.frequency).toEqual('weekly');
    expect(cleanRoomTask!.points).toEqual(10);
    expect(cleanRoomTask!.assigned_to).toEqual(john.id);
    expect(cleanRoomTask!.created_by).toEqual(jane.id);
    expect(cleanRoomTask!.is_active).toEqual(true);
    expect(cleanRoomTask!.id).toBeDefined();
    expect(cleanRoomTask!.created_at).toBeInstanceOf(Date);
    expect(cleanRoomTask!.updated_at).toBeInstanceOf(Date);

    // Check second task
    const vitaminsTask = result.find(task => task.title === 'Take Vitamins');
    expect(vitaminsTask).toBeDefined();
    expect(vitaminsTask!.description).toBeNull();
    expect(vitaminsTask!.task_type).toEqual('habit');
    expect(vitaminsTask!.frequency).toEqual('daily');
    expect(vitaminsTask!.points).toEqual(5);
    expect(vitaminsTask!.assigned_to).toEqual(jane.id);
    expect(vitaminsTask!.created_by).toEqual(john.id);
    expect(vitaminsTask!.is_active).toEqual(true);

    // Verify inactive task is not included
    const inactiveTask = result.find(task => task.title === 'Inactive Task');
    expect(inactiveTask).toBeUndefined();
  });

  it('should not return inactive tasks', async () => {
    // Create family member first
    const memberResult = await db.insert(familyMembersTable)
      .values({ name: 'Test User', email: 'test@example.com' })
      .returning()
      .execute();

    const member = memberResult[0];

    // Create only inactive tasks
    await db.insert(tasksTable)
      .values([
        {
          title: 'Inactive Task 1',
          task_type: 'chore',
          frequency: 'daily',
          points: 5,
          assigned_to: member.id,
          created_by: member.id,
          is_active: false
        },
        {
          title: 'Inactive Task 2',
          task_type: 'habit',
          frequency: 'weekly',
          points: 3,
          assigned_to: member.id,
          created_by: member.id,
          is_active: false
        }
      ])
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(0);
  });

  it('should handle all task types and frequencies', async () => {
    // Create family member
    const memberResult = await db.insert(familyMembersTable)
      .values({ name: 'Test User', email: 'test@example.com' })
      .returning()
      .execute();

    const member = memberResult[0];

    // Create tasks with different types and frequencies
    await db.insert(tasksTable)
      .values([
        {
          title: 'Habit Task',
          task_type: 'habit',
          frequency: 'daily',
          points: 5,
          assigned_to: member.id,
          created_by: member.id,
          is_active: true
        },
        {
          title: 'Chore Task',
          task_type: 'chore',
          frequency: 'weekly',
          points: 10,
          assigned_to: member.id,
          created_by: member.id,
          is_active: true
        },
        {
          title: 'Daily Task',
          task_type: 'daily',
          frequency: 'daily',
          points: 3,
          assigned_to: member.id,
          created_by: member.id,
          is_active: true
        },
        {
          title: 'Weekly Task',
          task_type: 'weekly',
          frequency: 'monthly',
          points: 15,
          assigned_to: member.id,
          created_by: member.id,
          is_active: true
        }
      ])
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(4);
    
    // Verify all task types are present
    const taskTypes = result.map(task => task.task_type);
    expect(taskTypes).toContain('habit');
    expect(taskTypes).toContain('chore');
    expect(taskTypes).toContain('daily');
    expect(taskTypes).toContain('weekly');

    // Verify all frequencies are present
    const frequencies = result.map(task => task.frequency);
    expect(frequencies).toContain('daily');
    expect(frequencies).toContain('weekly');
    expect(frequencies).toContain('monthly');
  });
});