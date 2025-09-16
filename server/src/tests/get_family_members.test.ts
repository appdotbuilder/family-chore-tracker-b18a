import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable } from '../db/schema';
import { type CreateFamilyMemberInput } from '../schema';
import { getFamilyMembers } from '../handlers/get_family_members';

// Test data
const testFamilyMember1: CreateFamilyMemberInput = {
  name: 'John Doe',
  email: 'john@example.com',
  avatar_url: 'https://example.com/avatar1.jpg'
};

const testFamilyMember2: CreateFamilyMemberInput = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  avatar_url: null
};

const testFamilyMember3: CreateFamilyMemberInput = {
  name: 'Bob Johnson',
  email: 'bob@example.com'
};

describe('getFamilyMembers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no family members exist', async () => {
    const result = await getFamilyMembers();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return single family member', async () => {
    // Insert test data
    await db.insert(familyMembersTable)
      .values({
        name: testFamilyMember1.name,
        email: testFamilyMember1.email,
        avatar_url: testFamilyMember1.avatar_url
      })
      .execute();

    const result = await getFamilyMembers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('John Doe');
    expect(result[0].email).toEqual('john@example.com');
    expect(result[0].avatar_url).toEqual('https://example.com/avatar1.jpg');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple family members', async () => {
    // Insert multiple test records
    await db.insert(familyMembersTable)
      .values([
        {
          name: testFamilyMember1.name,
          email: testFamilyMember1.email,
          avatar_url: testFamilyMember1.avatar_url
        },
        {
          name: testFamilyMember2.name,
          email: testFamilyMember2.email,
          avatar_url: testFamilyMember2.avatar_url
        },
        {
          name: testFamilyMember3.name,
          email: testFamilyMember3.email,
          avatar_url: testFamilyMember3.avatar_url
        }
      ])
      .execute();

    const result = await getFamilyMembers();

    expect(result).toHaveLength(3);
    
    // Check that all family members are returned
    const names = result.map(member => member.name);
    expect(names).toContain('John Doe');
    expect(names).toContain('Jane Smith');
    expect(names).toContain('Bob Johnson');

    // Verify structure of returned data
    result.forEach(member => {
      expect(member.id).toBeDefined();
      expect(typeof member.name).toBe('string');
      expect(typeof member.email).toBe('string');
      expect(member.avatar_url === null || typeof member.avatar_url === 'string').toBe(true);
      expect(member.created_at).toBeInstanceOf(Date);
      expect(member.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle family members with null avatar_url', async () => {
    // Insert family member with null avatar_url
    await db.insert(familyMembersTable)
      .values({
        name: testFamilyMember2.name,
        email: testFamilyMember2.email,
        avatar_url: testFamilyMember2.avatar_url
      })
      .execute();

    const result = await getFamilyMembers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Jane Smith');
    expect(result[0].email).toEqual('jane@example.com');
    expect(result[0].avatar_url).toBeNull();
  });

  it('should handle family members with undefined avatar_url', async () => {
    // Insert family member with undefined avatar_url (should be stored as null)
    await db.insert(familyMembersTable)
      .values({
        name: testFamilyMember3.name,
        email: testFamilyMember3.email,
        avatar_url: testFamilyMember3.avatar_url
      })
      .execute();

    const result = await getFamilyMembers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Bob Johnson');
    expect(result[0].email).toEqual('bob@example.com');
    expect(result[0].avatar_url).toBeNull();
  });

  it('should return family members in database order', async () => {
    // Insert family members in specific order
    const insertedMembers = await db.insert(familyMembersTable)
      .values([
        {
          name: 'Alice',
          email: 'alice@example.com',
          avatar_url: null
        },
        {
          name: 'Charlie',
          email: 'charlie@example.com',
          avatar_url: null
        },
        {
          name: 'Bob',
          email: 'bob@example.com',
          avatar_url: null
        }
      ])
      .returning()
      .execute();

    const result = await getFamilyMembers();

    expect(result).toHaveLength(3);
    
    // Verify the order matches insertion order (by ID)
    expect(result[0].name).toEqual('Alice');
    expect(result[1].name).toEqual('Charlie');
    expect(result[2].name).toEqual('Bob');
    
    // Verify IDs are in ascending order
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
  });
});