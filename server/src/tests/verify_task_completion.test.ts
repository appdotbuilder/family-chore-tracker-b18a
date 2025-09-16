import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable, tasksTable, taskCompletionsTable } from '../db/schema';
import { type VerifyTaskCompletionInput } from '../schema';
import { verifyTaskCompletion } from '../handlers/verify_task_completion';
import { eq } from 'drizzle-orm';

describe('verifyTaskCompletion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should verify a task completion successfully', async () => {
    // Create test family members
    const [familyMember1, familyMember2] = await db.insert(familyMembersTable)
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

    // Create a test task
    const [task] = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task for testing',
        task_type: 'chore',
        frequency: 'daily',
        points: 10,
        assigned_to: familyMember1.id,
        created_by: familyMember2.id,
        is_active: true
      })
      .returning()
      .execute();

    // Create a task completion to verify
    const [completion] = await db.insert(taskCompletionsTable)
      .values({
        task_id: task.id,
        family_member_id: familyMember1.id,
        status: 'completed',
        proof_image_url: 'http://example.com/proof.jpg',
        notes: 'Task completed successfully'
      })
      .returning()
      .execute();

    const testInput: VerifyTaskCompletionInput = {
      completion_id: completion.id,
      verified_by: familyMember2.id,
      status: 'verified'
    };

    const result = await verifyTaskCompletion(testInput);

    // Verify the result
    expect(result.id).toEqual(completion.id);
    expect(result.task_id).toEqual(task.id);
    expect(result.family_member_id).toEqual(familyMember1.id);
    expect(result.status).toEqual('verified');
    expect(result.verified_by).toEqual(familyMember2.id);
    expect(result.verified_at).toBeInstanceOf(Date);
    expect(result.proof_image_url).toEqual('http://example.com/proof.jpg');
    expect(result.notes).toEqual('Task completed successfully');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should save verification details to database', async () => {
    // Create test family members
    const [familyMember1, familyMember2] = await db.insert(familyMembersTable)
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

    // Create a test task
    const [task] = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task for testing',
        task_type: 'habit',
        frequency: 'weekly',
        points: 20,
        assigned_to: familyMember1.id,
        created_by: familyMember2.id,
        is_active: true
      })
      .returning()
      .execute();

    // Create a task completion to verify
    const [completion] = await db.insert(taskCompletionsTable)
      .values({
        task_id: task.id,
        family_member_id: familyMember1.id,
        status: 'completed',
        proof_image_url: null,
        notes: null
      })
      .returning()
      .execute();

    const testInput: VerifyTaskCompletionInput = {
      completion_id: completion.id,
      verified_by: familyMember2.id,
      status: 'verified'
    };

    const result = await verifyTaskCompletion(testInput);

    // Query database to verify changes were saved
    const updatedCompletion = await db.select()
      .from(taskCompletionsTable)
      .where(eq(taskCompletionsTable.id, result.id))
      .execute();

    expect(updatedCompletion).toHaveLength(1);
    expect(updatedCompletion[0].status).toEqual('verified');
    expect(updatedCompletion[0].verified_by).toEqual(familyMember2.id);
    expect(updatedCompletion[0].verified_at).toBeInstanceOf(Date);
    
    // Ensure the verification timestamp is recent (within last 5 seconds)
    const now = new Date();
    const timeDiff = now.getTime() - updatedCompletion[0].verified_at!.getTime();
    expect(timeDiff).toBeLessThan(5000);
  });

  it('should handle pending status verification', async () => {
    // Create test family members
    const [familyMember1, familyMember2] = await db.insert(familyMembersTable)
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

    // Create a test task
    const [task] = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task for testing',
        task_type: 'daily',
        frequency: 'daily',
        points: 5,
        assigned_to: familyMember1.id,
        created_by: familyMember2.id,
        is_active: true
      })
      .returning()
      .execute();

    // Create a task completion to mark as pending
    const [completion] = await db.insert(taskCompletionsTable)
      .values({
        task_id: task.id,
        family_member_id: familyMember1.id,
        status: 'completed',
        proof_image_url: null,
        notes: 'Needs verification'
      })
      .returning()
      .execute();

    const testInput: VerifyTaskCompletionInput = {
      completion_id: completion.id,
      verified_by: familyMember2.id,
      status: 'pending'
    };

    const result = await verifyTaskCompletion(testInput);

    expect(result.status).toEqual('pending');
    expect(result.verified_by).toEqual(familyMember2.id);
    expect(result.verified_at).toBeInstanceOf(Date);
  });

  it('should throw error when completion does not exist', async () => {
    // Create a family member for the verifier
    const [familyMember] = await db.insert(familyMembersTable)
      .values({
        name: 'Jane Doe',
        email: 'jane@example.com',
        avatar_url: null
      })
      .returning()
      .execute();

    const testInput: VerifyTaskCompletionInput = {
      completion_id: 99999, // Non-existent completion ID
      verified_by: familyMember.id,
      status: 'verified'
    };

    expect(verifyTaskCompletion(testInput)).rejects.toThrow(/completion.*not found/i);
  });

  it('should throw error when verifier family member does not exist', async () => {
    // Create test family member
    const [familyMember] = await db.insert(familyMembersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com',
        avatar_url: null
      })
      .returning()
      .execute();

    // Create a test task
    const [task] = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task for testing',
        task_type: 'weekly',
        frequency: 'weekly',
        points: 15,
        assigned_to: familyMember.id,
        created_by: familyMember.id,
        is_active: true
      })
      .returning()
      .execute();

    // Create a task completion
    const [completion] = await db.insert(taskCompletionsTable)
      .values({
        task_id: task.id,
        family_member_id: familyMember.id,
        status: 'completed',
        proof_image_url: null,
        notes: null
      })
      .returning()
      .execute();

    const testInput: VerifyTaskCompletionInput = {
      completion_id: completion.id,
      verified_by: 99999, // Non-existent family member ID
      status: 'verified'
    };

    expect(verifyTaskCompletion(testInput)).rejects.toThrow(/family member.*not found/i);
  });

  it('should update existing verification', async () => {
    // Create test family members
    const [familyMember1, familyMember2] = await db.insert(familyMembersTable)
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

    // Create a test task
    const [task] = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task for testing',
        task_type: 'chore',
        frequency: 'monthly',
        points: 30,
        assigned_to: familyMember1.id,
        created_by: familyMember2.id,
        is_active: true
      })
      .returning()
      .execute();

    // Create a task completion that was already verified
    const initialVerificationDate = new Date('2024-01-01T10:00:00Z');
    const [completion] = await db.insert(taskCompletionsTable)
      .values({
        task_id: task.id,
        family_member_id: familyMember1.id,
        status: 'verified',
        verified_by: familyMember2.id,
        verified_at: initialVerificationDate,
        proof_image_url: null,
        notes: 'Initially verified'
      })
      .returning()
      .execute();

    // Update the verification status
    const testInput: VerifyTaskCompletionInput = {
      completion_id: completion.id,
      verified_by: familyMember2.id,
      status: 'pending'
    };

    const result = await verifyTaskCompletion(testInput);

    expect(result.status).toEqual('pending');
    expect(result.verified_by).toEqual(familyMember2.id);
    expect(result.verified_at).toBeInstanceOf(Date);
    
    // Verify the timestamp was updated (should be different from initial)
    expect(result.verified_at!.getTime()).not.toEqual(initialVerificationDate.getTime());
  });
});