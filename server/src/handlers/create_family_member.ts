import { db } from '../db';
import { familyMembersTable } from '../db/schema';
import { type CreateFamilyMemberInput, type FamilyMember } from '../schema';

export const createFamilyMember = async (input: CreateFamilyMemberInput): Promise<FamilyMember> => {
  try {
    // Insert family member record
    const result = await db.insert(familyMembersTable)
      .values({
        name: input.name,
        email: input.email,
        avatar_url: input.avatar_url || null
      })
      .returning()
      .execute();

    // Return the created family member
    const familyMember = result[0];
    return {
      ...familyMember
    };
  } catch (error) {
    console.error('Family member creation failed:', error);
    throw error;
  }
};