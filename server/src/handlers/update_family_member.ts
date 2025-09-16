import { db } from '../db';
import { familyMembersTable } from '../db/schema';
import { type UpdateFamilyMemberInput, type FamilyMember } from '../schema';
import { eq } from 'drizzle-orm';

export const updateFamilyMember = async (input: UpdateFamilyMemberInput): Promise<FamilyMember> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof familyMembersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.email !== undefined) {
      updateData.email = input.email;
    }

    if (input.avatar_url !== undefined) {
      updateData.avatar_url = input.avatar_url;
    }

    // Update the family member record
    const result = await db.update(familyMembersTable)
      .set(updateData)
      .where(eq(familyMembersTable.id, input.id))
      .returning()
      .execute();

    // Check if family member was found and updated
    if (result.length === 0) {
      throw new Error(`Family member with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Family member update failed:', error);
    throw error;
  }
};