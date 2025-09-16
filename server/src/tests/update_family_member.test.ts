import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable } from '../db/schema';
import { type UpdateFamilyMemberInput, type CreateFamilyMemberInput } from '../schema';
import { updateFamilyMember } from '../handlers/update_family_member';
import { eq } from 'drizzle-orm';

// Helper function to create a test family member
const createTestFamilyMember = async (input: CreateFamilyMemberInput) => {
  const result = await db.insert(familyMembersTable)
    .values({
      name: input.name,
      email: input.email,
      avatar_url: input.avatar_url || null
    })
    .returning()
    .execute();
  return result[0];
};

const testFamilyMemberInput: CreateFamilyMemberInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

describe('updateFamilyMember', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update family member name', async () => {
    // Create a test family member first
    const created = await createTestFamilyMember(testFamilyMemberInput);

    const updateInput: UpdateFamilyMemberInput = {
      id: created.id,
      name: 'Jane Doe'
    };

    const result = await updateFamilyMember(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('Jane Doe');
    expect(result.email).toEqual(created.email); // Should remain unchanged
    expect(result.avatar_url).toEqual(created.avatar_url); // Should remain unchanged
    expect(result.created_at).toEqual(created.created_at); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > created.updated_at).toBe(true); // Should be newer
  });

  it('should update family member email', async () => {
    const created = await createTestFamilyMember(testFamilyMemberInput);

    const updateInput: UpdateFamilyMemberInput = {
      id: created.id,
      email: 'jane.doe@example.com'
    };

    const result = await updateFamilyMember(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual(created.name); // Should remain unchanged
    expect(result.email).toEqual('jane.doe@example.com');
    expect(result.avatar_url).toEqual(created.avatar_url); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > created.updated_at).toBe(true);
  });

  it('should update avatar_url to null', async () => {
    const created = await createTestFamilyMember(testFamilyMemberInput);

    const updateInput: UpdateFamilyMemberInput = {
      id: created.id,
      avatar_url: null
    };

    const result = await updateFamilyMember(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual(created.name); // Should remain unchanged
    expect(result.email).toEqual(created.email); // Should remain unchanged
    expect(result.avatar_url).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > created.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const created = await createTestFamilyMember(testFamilyMemberInput);

    const updateInput: UpdateFamilyMemberInput = {
      id: created.id,
      name: 'Updated Name',
      email: 'updated@example.com',
      avatar_url: 'https://example.com/new-avatar.jpg'
    };

    const result = await updateFamilyMember(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('Updated Name');
    expect(result.email).toEqual('updated@example.com');
    expect(result.avatar_url).toEqual('https://example.com/new-avatar.jpg');
    expect(result.created_at).toEqual(created.created_at); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > created.updated_at).toBe(true);
  });

  it('should save updated data to database', async () => {
    const created = await createTestFamilyMember(testFamilyMemberInput);

    const updateInput: UpdateFamilyMemberInput = {
      id: created.id,
      name: 'Database Test Name'
    };

    await updateFamilyMember(updateInput);

    // Verify the update was persisted to database
    const familyMembers = await db.select()
      .from(familyMembersTable)
      .where(eq(familyMembersTable.id, created.id))
      .execute();

    expect(familyMembers).toHaveLength(1);
    expect(familyMembers[0].name).toEqual('Database Test Name');
    expect(familyMembers[0].email).toEqual(created.email);
    expect(familyMembers[0].updated_at).toBeInstanceOf(Date);
    expect(familyMembers[0].updated_at > created.updated_at).toBe(true);
  });

  it('should handle family member with no avatar_url', async () => {
    // Create family member without avatar_url
    const memberInput = {
      name: 'No Avatar User',
      email: 'noavatar@example.com'
    };
    const created = await createTestFamilyMember(memberInput);

    const updateInput: UpdateFamilyMemberInput = {
      id: created.id,
      name: 'Updated No Avatar User'
    };

    const result = await updateFamilyMember(updateInput);

    expect(result.name).toEqual('Updated No Avatar User');
    expect(result.avatar_url).toBeNull();
  });

  it('should throw error when family member does not exist', async () => {
    const updateInput: UpdateFamilyMemberInput = {
      id: 99999, // Non-existent ID
      name: 'Non Existent User'
    };

    await expect(updateFamilyMember(updateInput)).rejects.toThrow(/family member with id 99999 not found/i);
  });

  it('should update only provided fields and leave others unchanged', async () => {
    const created = await createTestFamilyMember(testFamilyMemberInput);

    // Update only name, leave email and avatar_url unchanged
    const updateInput: UpdateFamilyMemberInput = {
      id: created.id,
      name: 'Only Name Changed'
    };

    const result = await updateFamilyMember(updateInput);

    expect(result.name).toEqual('Only Name Changed');
    expect(result.email).toEqual(created.email); // Unchanged
    expect(result.avatar_url).toEqual(created.avatar_url); // Unchanged
  });
});