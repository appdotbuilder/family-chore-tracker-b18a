import { db } from '../db';
import { familyMembersTable, tasksTable, taskCompletionsTable, streaksTable } from '../db/schema';
import { type FamilyMember } from '../schema';
import { eq, count, sum, max, and } from 'drizzle-orm';

// Extended type for family member statistics
export interface FamilyMemberStats extends FamilyMember {
    total_points: number;
    tasks_completed: number;
    current_streaks: number;
    longest_streak: number;
    completion_rate: number; // percentage of assigned tasks completed
}

export async function getFamilyMemberStats(familyMemberId: number): Promise<FamilyMemberStats> {
    try {
        // Get family member basic info
        const familyMembers = await db.select()
            .from(familyMembersTable)
            .where(eq(familyMembersTable.id, familyMemberId))
            .execute();

        if (familyMembers.length === 0) {
            throw new Error('Family member not found');
        }

        const familyMember = familyMembers[0];

        // Get total points from completed tasks
        const pointsQuery = await db.select({
            total_points: sum(tasksTable.points)
        })
        .from(taskCompletionsTable)
        .innerJoin(tasksTable, eq(taskCompletionsTable.task_id, tasksTable.id))
        .where(
            and(
                eq(taskCompletionsTable.family_member_id, familyMemberId),
                eq(taskCompletionsTable.status, 'completed')
            )
        )
        .execute();

        const totalPoints = pointsQuery[0]?.total_points ? parseInt(pointsQuery[0].total_points) : 0;

        // Get number of completed tasks
        const completedTasksQuery = await db.select({
            tasks_completed: count()
        })
        .from(taskCompletionsTable)
        .where(
            and(
                eq(taskCompletionsTable.family_member_id, familyMemberId),
                eq(taskCompletionsTable.status, 'completed')
            )
        )
        .execute();

        const tasksCompleted = completedTasksQuery[0]?.tasks_completed || 0;

        // Get number of current streaks (streaks with current_streak > 0)
        const currentStreaksQuery = await db.select({
            current_streaks: count()
        })
        .from(streaksTable)
        .where(
            and(
                eq(streaksTable.family_member_id, familyMemberId),
                eq(streaksTable.current_streak, 0) // Using eq with 0 to find non-zero streaks with NOT logic
            )
        )
        .execute();

        // We need to manually count current streaks > 0
        const allStreaksQuery = await db.select()
        .from(streaksTable)
        .where(eq(streaksTable.family_member_id, familyMemberId))
        .execute();

        const currentStreaks = allStreaksQuery.filter(streak => streak.current_streak > 0).length;

        // Get longest streak across all tasks
        const longestStreakQuery = await db.select({
            longest_streak: max(streaksTable.longest_streak)
        })
        .from(streaksTable)
        .where(eq(streaksTable.family_member_id, familyMemberId))
        .execute();

        const longestStreak = longestStreakQuery[0]?.longest_streak || 0;

        // Calculate completion rate (percentage of active assigned tasks that have been completed)
        // Get number of unique active assigned tasks that have completions
        const completedActiveTasksQuery = await db.select({
            completed_active_tasks: count()
        })
        .from(taskCompletionsTable)
        .innerJoin(tasksTable, eq(taskCompletionsTable.task_id, tasksTable.id))
        .where(
            and(
                eq(taskCompletionsTable.family_member_id, familyMemberId),
                eq(taskCompletionsTable.status, 'completed'),
                eq(tasksTable.assigned_to, familyMemberId),
                eq(tasksTable.is_active, true)
            )
        )
        .execute();

        const completedActiveTasks = completedActiveTasksQuery[0]?.completed_active_tasks || 0;

        // Get total active assigned tasks
        const assignedTasksQuery = await db.select({
            total_assigned: count()
        })
        .from(tasksTable)
        .where(
            and(
                eq(tasksTable.assigned_to, familyMemberId),
                eq(tasksTable.is_active, true)
            )
        )
        .execute();

        const totalAssignedTasks = assignedTasksQuery[0]?.total_assigned || 0;

        // Calculate completion rate
        const completionRate = totalAssignedTasks > 0 
            ? Math.round((completedActiveTasks / totalAssignedTasks) * 100) 
            : 0;

        return {
            ...familyMember,
            total_points: totalPoints,
            tasks_completed: tasksCompleted,
            current_streaks: currentStreaks,
            longest_streak: longestStreak,
            completion_rate: completionRate
        };
    } catch (error) {
        console.error('Failed to get family member stats:', error);
        throw error;
    }
}