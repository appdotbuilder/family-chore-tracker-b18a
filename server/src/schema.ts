import { z } from 'zod';

// Enum schemas
export const taskTypeSchema = z.enum(['habit', 'chore', 'daily', 'weekly']);
export const taskStatusSchema = z.enum(['pending', 'completed', 'verified']);
export const frequencySchema = z.enum(['daily', 'weekly', 'monthly']);

export type TaskType = z.infer<typeof taskTypeSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type Frequency = z.infer<typeof frequencySchema>;

// Family member schema
export const familyMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  avatar_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type FamilyMember = z.infer<typeof familyMemberSchema>;

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  task_type: taskTypeSchema,
  frequency: frequencySchema,
  points: z.number().int(),
  assigned_to: z.number(),
  created_by: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Task completion schema
export const taskCompletionSchema = z.object({
  id: z.number(),
  task_id: z.number(),
  family_member_id: z.number(),
  completed_at: z.coerce.date(),
  status: taskStatusSchema,
  proof_image_url: z.string().nullable(),
  notes: z.string().nullable(),
  verified_by: z.number().nullable(),
  verified_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type TaskCompletion = z.infer<typeof taskCompletionSchema>;

// Streak schema
export const streakSchema = z.object({
  id: z.number(),
  family_member_id: z.number(),
  task_id: z.number(),
  current_streak: z.number().int(),
  longest_streak: z.number().int(),
  last_completion_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Streak = z.infer<typeof streakSchema>;

// Input schemas for creating records
export const createFamilyMemberInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  avatar_url: z.string().url().nullable().optional()
});

export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberInputSchema>;

export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  task_type: taskTypeSchema,
  frequency: frequencySchema,
  points: z.number().int().positive(),
  assigned_to: z.number(),
  created_by: z.number()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const createTaskCompletionInputSchema = z.object({
  task_id: z.number(),
  family_member_id: z.number(),
  proof_image_url: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type CreateTaskCompletionInput = z.infer<typeof createTaskCompletionInputSchema>;

// Input schemas for updating records
export const updateFamilyMemberInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().nullable().optional()
});

export type UpdateFamilyMemberInput = z.infer<typeof updateFamilyMemberInputSchema>;

export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  task_type: taskTypeSchema.optional(),
  frequency: frequencySchema.optional(),
  points: z.number().int().positive().optional(),
  assigned_to: z.number().optional(),
  is_active: z.boolean().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const verifyTaskCompletionInputSchema = z.object({
  completion_id: z.number(),
  verified_by: z.number(),
  status: taskStatusSchema
});

export type VerifyTaskCompletionInput = z.infer<typeof verifyTaskCompletionInputSchema>;

// Query input schemas
export const getFamilyMemberTasksInputSchema = z.object({
  family_member_id: z.number(),
  task_type: taskTypeSchema.optional(),
  status: taskStatusSchema.optional()
});

export type GetFamilyMemberTasksInput = z.infer<typeof getFamilyMemberTasksInputSchema>;

export const getTaskCompletionsInputSchema = z.object({
  task_id: z.number().optional(),
  family_member_id: z.number().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional()
});

export type GetTaskCompletionsInput = z.infer<typeof getTaskCompletionsInputSchema>;

export const getStreaksInputSchema = z.object({
  family_member_id: z.number().optional(),
  task_id: z.number().optional()
});

export type GetStreaksInput = z.infer<typeof getStreaksInputSchema>;