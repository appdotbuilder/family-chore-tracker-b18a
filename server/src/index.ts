import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createFamilyMemberInputSchema,
  updateFamilyMemberInputSchema,
  createTaskInputSchema,
  updateTaskInputSchema,
  createTaskCompletionInputSchema,
  verifyTaskCompletionInputSchema,
  getFamilyMemberTasksInputSchema,
  getTaskCompletionsInputSchema,
  getStreaksInputSchema
} from './schema';

// Import handlers
import { createFamilyMember } from './handlers/create_family_member';
import { getFamilyMembers } from './handlers/get_family_members';
import { updateFamilyMember } from './handlers/update_family_member';
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { getFamilyMemberTasks } from './handlers/get_family_member_tasks';
import { updateTask } from './handlers/update_task';
import { completeTask } from './handlers/complete_task';
import { verifyTaskCompletion } from './handlers/verify_task_completion';
import { getTaskCompletions } from './handlers/get_task_completions';
import { getStreaks } from './handlers/get_streaks';
import { getFamilyMemberStats } from './handlers/get_family_member_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Family member routes
  createFamilyMember: publicProcedure
    .input(createFamilyMemberInputSchema)
    .mutation(({ input }) => createFamilyMember(input)),

  getFamilyMembers: publicProcedure
    .query(() => getFamilyMembers()),

  updateFamilyMember: publicProcedure
    .input(updateFamilyMemberInputSchema)
    .mutation(({ input }) => updateFamilyMember(input)),

  getFamilyMemberStats: publicProcedure
    .input(z.object({ familyMemberId: z.number() }))
    .query(({ input }) => getFamilyMemberStats(input.familyMemberId)),

  // Task routes
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input)),

  getTasks: publicProcedure
    .query(() => getTasks()),

  getFamilyMemberTasks: publicProcedure
    .input(getFamilyMemberTasksInputSchema)
    .query(({ input }) => getFamilyMemberTasks(input)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),

  // Task completion routes
  completeTask: publicProcedure
    .input(createTaskCompletionInputSchema)
    .mutation(({ input }) => completeTask(input)),

  verifyTaskCompletion: publicProcedure
    .input(verifyTaskCompletionInputSchema)
    .mutation(({ input }) => verifyTaskCompletion(input)),

  getTaskCompletions: publicProcedure
    .input(getTaskCompletionsInputSchema)
    .query(({ input }) => getTaskCompletions(input)),

  // Streak routes
  getStreaks: publicProcedure
    .input(getStreaksInputSchema)
    .query(({ input }) => getStreaks(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Family Chore Tracker TRPC server listening at port: ${port}`);
}

start();