import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer, 
  boolean, 
  pgEnum 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const taskTypeEnum = pgEnum('task_type', ['habit', 'chore', 'daily', 'weekly']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'completed', 'verified']);
export const frequencyEnum = pgEnum('frequency', ['daily', 'weekly', 'monthly']);

// Family members table
export const familyMembersTable = pgTable('family_members', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  avatar_url: text('avatar_url'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  task_type: taskTypeEnum('task_type').notNull(),
  frequency: frequencyEnum('frequency').notNull(),
  points: integer('points').notNull(),
  assigned_to: integer('assigned_to').notNull(),
  created_by: integer('created_by').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Task completions table
export const taskCompletionsTable = pgTable('task_completions', {
  id: serial('id').primaryKey(),
  task_id: integer('task_id').notNull(),
  family_member_id: integer('family_member_id').notNull(),
  completed_at: timestamp('completed_at').defaultNow().notNull(),
  status: taskStatusEnum('status').default('completed').notNull(),
  proof_image_url: text('proof_image_url'), // Nullable by default
  notes: text('notes'), // Nullable by default
  verified_by: integer('verified_by'), // Nullable by default
  verified_at: timestamp('verified_at'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Streaks table
export const streaksTable = pgTable('streaks', {
  id: serial('id').primaryKey(),
  family_member_id: integer('family_member_id').notNull(),
  task_id: integer('task_id').notNull(),
  current_streak: integer('current_streak').default(0).notNull(),
  longest_streak: integer('longest_streak').default(0).notNull(),
  last_completion_date: timestamp('last_completion_date'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const familyMembersRelations = relations(familyMembersTable, ({ many }) => ({
  assignedTasks: many(tasksTable, { relationName: 'assignedTasks' }),
  createdTasks: many(tasksTable, { relationName: 'createdTasks' }),
  taskCompletions: many(taskCompletionsTable),
  streaks: many(streaksTable),
  verifiedCompletions: many(taskCompletionsTable, { relationName: 'verifiedCompletions' }),
}));

export const tasksRelations = relations(tasksTable, ({ one, many }) => ({
  assignedTo: one(familyMembersTable, {
    fields: [tasksTable.assigned_to],
    references: [familyMembersTable.id],
    relationName: 'assignedTasks',
  }),
  createdBy: one(familyMembersTable, {
    fields: [tasksTable.created_by],
    references: [familyMembersTable.id],
    relationName: 'createdTasks',
  }),
  completions: many(taskCompletionsTable),
  streaks: many(streaksTable),
}));

export const taskCompletionsRelations = relations(taskCompletionsTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [taskCompletionsTable.task_id],
    references: [tasksTable.id],
  }),
  familyMember: one(familyMembersTable, {
    fields: [taskCompletionsTable.family_member_id],
    references: [familyMembersTable.id],
  }),
  verifiedBy: one(familyMembersTable, {
    fields: [taskCompletionsTable.verified_by],
    references: [familyMembersTable.id],
    relationName: 'verifiedCompletions',
  }),
}));

export const streaksRelations = relations(streaksTable, ({ one }) => ({
  familyMember: one(familyMembersTable, {
    fields: [streaksTable.family_member_id],
    references: [familyMembersTable.id],
  }),
  task: one(tasksTable, {
    fields: [streaksTable.task_id],
    references: [tasksTable.id],
  }),
}));

// TypeScript types for table schemas
export type FamilyMember = typeof familyMembersTable.$inferSelect;
export type NewFamilyMember = typeof familyMembersTable.$inferInsert;

export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;

export type TaskCompletion = typeof taskCompletionsTable.$inferSelect;
export type NewTaskCompletion = typeof taskCompletionsTable.$inferInsert;

export type Streak = typeof streaksTable.$inferSelect;
export type NewStreak = typeof streaksTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  familyMembers: familyMembersTable,
  tasks: tasksTable,
  taskCompletions: taskCompletionsTable,
  streaks: streaksTable,
};