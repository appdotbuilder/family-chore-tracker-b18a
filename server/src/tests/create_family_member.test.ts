import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable } from '../db/schema';
import { type CreateFamilyMemberInput } from '../schema';
import { createFamilyMember } from '../handlers/create_family_member';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateFamilyMemberInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

// Test input without optional avatar_url
const testInputNoAvatar: CreateFamilyMemberInput = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com'
};

describe('createFamilyMember', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a family member with all fields', async () => {
    const result = await createFamilyMember(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a family member without avatar_url', async () => {
    const result = await createFamilyMember(testInputNoAvatar);

    // Basic field validation
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.avatar_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save family member to database', async () => {
    const result = await createFamilyMember(testInput);

    // Query using proper drizzle syntax
    const familyMembers = await db.select()
      .from(familyMembersTable)
      .where(eq(familyMembersTable.id, result.id))
      .execute();

    expect(familyMembers).toHaveLength(1);
    expect(familyMembers[0].name).toEqual('John Doe');
    expect(familyMembers[0].email).toEqual('john.doe@example.com');
    expect(familyMembers[0].avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(familyMembers[0].created_at).toBeInstanceOf(Date);
    expect(familyMembers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle explicit null avatar_url', async () => {
    const inputWithNullAvatar: CreateFamilyMemberInput = {
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com',
      avatar_url: null
    };

    const result = await createFamilyMember(inputWithNullAvatar);

    expect(result.name).toEqual('Bob Wilson');
    expect(result.email).toEqual('bob.wilson@example.com');
    expect(result.avatar_url).toBeNull();
  });

  it('should enforce unique email constraint', async () => {
    // Create first family member
    await createFamilyMember(testInput);

    // Try to create another family member with same email
    const duplicateEmailInput: CreateFamilyMemberInput = {
      name: 'Different Name',
      email: 'john.doe@example.com', // Same email as first member
      avatar_url: 'https://different-avatar.com/avatar.jpg'
    };

    // Should throw error due to unique constraint violation
    await expect(createFamilyMember(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });

  it('should create multiple family members with different emails', async () => {
    const result1 = await createFamilyMember(testInput);
    const result2 = await createFamilyMember(testInputNoAvatar);

    // Both should be created successfully
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.email).toEqual('john.doe@example.com');
    expect(result2.email).toEqual('jane.smith@example.com');

    // Verify both exist in database
    const allMembers = await db.select()
      .from(familyMembersTable)
      .execute();

    expect(allMembers).toHaveLength(2);
    
    const emails = allMembers.map(member => member.email);
    expect(emails).toContain('john.doe@example.com');
    expect(emails).toContain('jane.smith@example.com');
  });
});