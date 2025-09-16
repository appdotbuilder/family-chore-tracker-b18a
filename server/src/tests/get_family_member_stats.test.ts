import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { familyMembersTable, tasksTable, taskCompletionsTable, streaksTable } from '../db/schema';
import { getFamilyMemberStats } from '../handlers/get_family_member_stats';

describe('getFamilyMemberStats', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return stats for family member with no activity', async () => {
        // Create a family member with no tasks or completions
        const familyMemberResult = await db.insert(familyMembersTable)
            .values({
                name: 'Test Member',
                email: 'test@example.com',
                avatar_url: null
            })
            .returning()
            .execute();

        const familyMember = familyMemberResult[0];

        const stats = await getFamilyMemberStats(familyMember.id);

        expect(stats.id).toBe(familyMember.id);
        expect(stats.name).toBe('Test Member');
        expect(stats.email).toBe('test@example.com');
        expect(stats.total_points).toBe(0);
        expect(stats.tasks_completed).toBe(0);
        expect(stats.current_streaks).toBe(0);
        expect(stats.longest_streak).toBe(0);
        expect(stats.completion_rate).toBe(0);
    });

    it('should calculate stats correctly for active family member', async () => {
        // Create family members
        const memberResult = await db.insert(familyMembersTable)
            .values({
                name: 'Active Member',
                email: 'active@example.com'
            })
            .returning()
            .execute();

        const creatorResult = await db.insert(familyMembersTable)
            .values({
                name: 'Creator',
                email: 'creator@example.com'
            })
            .returning()
            .execute();

        const activeMember = memberResult[0];
        const creator = creatorResult[0];

        // Create tasks assigned to the member
        const task1Result = await db.insert(tasksTable)
            .values({
                title: 'Task 1',
                description: 'First task',
                task_type: 'daily',
                frequency: 'daily',
                points: 10,
                assigned_to: activeMember.id,
                created_by: creator.id,
                is_active: true
            })
            .returning()
            .execute();

        const task2Result = await db.insert(tasksTable)
            .values({
                title: 'Task 2',
                description: 'Second task',
                task_type: 'weekly',
                frequency: 'weekly',
                points: 20,
                assigned_to: activeMember.id,
                created_by: creator.id,
                is_active: true
            })
            .returning()
            .execute();

        const task3Result = await db.insert(tasksTable)
            .values({
                title: 'Task 3',
                description: 'Third task',
                task_type: 'habit',
                frequency: 'daily',
                points: 15,
                assigned_to: activeMember.id,
                created_by: creator.id,
                is_active: true
            })
            .returning()
            .execute();

        const task1 = task1Result[0];
        const task2 = task2Result[0];
        const task3 = task3Result[0];

        // Create task completions (2 out of 3 tasks completed)
        await db.insert(taskCompletionsTable)
            .values([
                {
                    task_id: task1.id,
                    family_member_id: activeMember.id,
                    status: 'completed',
                    notes: 'Completed task 1'
                },
                {
                    task_id: task2.id,
                    family_member_id: activeMember.id,
                    status: 'completed',
                    notes: 'Completed task 2'
                }
            ])
            .execute();

        // Create streaks
        await db.insert(streaksTable)
            .values([
                {
                    family_member_id: activeMember.id,
                    task_id: task1.id,
                    current_streak: 5,
                    longest_streak: 10,
                    last_completion_date: new Date()
                },
                {
                    family_member_id: activeMember.id,
                    task_id: task2.id,
                    current_streak: 3,
                    longest_streak: 7,
                    last_completion_date: new Date()
                },
                {
                    family_member_id: activeMember.id,
                    task_id: task3.id,
                    current_streak: 0, // No current streak
                    longest_streak: 15,
                    last_completion_date: null
                }
            ])
            .execute();

        const stats = await getFamilyMemberStats(activeMember.id);

        expect(stats.id).toBe(activeMember.id);
        expect(stats.name).toBe('Active Member');
        expect(stats.email).toBe('active@example.com');
        expect(stats.total_points).toBe(30); // 10 + 20 points from completed tasks
        expect(stats.tasks_completed).toBe(2); // 2 completed tasks
        expect(stats.current_streaks).toBe(2); // 2 tasks with current_streak > 0
        expect(stats.longest_streak).toBe(15); // Highest longest_streak
        expect(stats.completion_rate).toBe(67); // 2/3 tasks completed = 67%
    });

    it('should handle pending task completions correctly', async () => {
        // Create family member
        const memberResult = await db.insert(familyMembersTable)
            .values({
                name: 'Test Member',
                email: 'test@example.com'
            })
            .returning()
            .execute();

        const creatorResult = await db.insert(familyMembersTable)
            .values({
                name: 'Creator',
                email: 'creator@example.com'
            })
            .returning()
            .execute();

        const member = memberResult[0];
        const creator = creatorResult[0];

        // Create task
        const taskResult = await db.insert(tasksTable)
            .values({
                title: 'Test Task',
                task_type: 'daily',
                frequency: 'daily',
                points: 25,
                assigned_to: member.id,
                created_by: creator.id,
                is_active: true
            })
            .returning()
            .execute();

        const task = taskResult[0];

        // Create task completions with different statuses
        await db.insert(taskCompletionsTable)
            .values([
                {
                    task_id: task.id,
                    family_member_id: member.id,
                    status: 'completed'
                },
                {
                    task_id: task.id,
                    family_member_id: member.id,
                    status: 'pending' // This should not count toward points or completion
                }
            ])
            .execute();

        const stats = await getFamilyMemberStats(member.id);

        expect(stats.total_points).toBe(25); // Only completed task counts
        expect(stats.tasks_completed).toBe(1); // Only completed task counts
        expect(stats.completion_rate).toBe(100); // 1/1 assigned tasks completed
    });

    it('should handle inactive tasks correctly', async () => {
        // Create family member
        const memberResult = await db.insert(familyMembersTable)
            .values({
                name: 'Test Member',
                email: 'test@example.com'
            })
            .returning()
            .execute();

        const creatorResult = await db.insert(familyMembersTable)
            .values({
                name: 'Creator',
                email: 'creator@example.com'
            })
            .returning()
            .execute();

        const member = memberResult[0];
        const creator = creatorResult[0];

        // Create active and inactive tasks
        const activeTaskResult = await db.insert(tasksTable)
            .values({
                title: 'Active Task',
                task_type: 'daily',
                frequency: 'daily',
                points: 10,
                assigned_to: member.id,
                created_by: creator.id,
                is_active: true
            })
            .returning()
            .execute();

        const inactiveTaskResult = await db.insert(tasksTable)
            .values({
                title: 'Inactive Task',
                task_type: 'weekly',
                frequency: 'weekly',
                points: 20,
                assigned_to: member.id,
                created_by: creator.id,
                is_active: false
            })
            .returning()
            .execute();

        const activeTask = activeTaskResult[0];
        const inactiveTask = inactiveTaskResult[0];

        // Complete both tasks
        await db.insert(taskCompletionsTable)
            .values([
                {
                    task_id: activeTask.id,
                    family_member_id: member.id,
                    status: 'completed'
                },
                {
                    task_id: inactiveTask.id,
                    family_member_id: member.id,
                    status: 'completed'
                }
            ])
            .execute();

        const stats = await getFamilyMemberStats(member.id);

        // All completed tasks count for points and completion count
        expect(stats.total_points).toBe(30); // Both tasks' points count
        expect(stats.tasks_completed).toBe(2); // Both completed tasks count

        // But only active tasks count for completion rate calculation
        expect(stats.completion_rate).toBe(100); // 1 completed / 1 active assigned = 100%
    });

    it('should throw error for non-existent family member', async () => {
        await expect(getFamilyMemberStats(999)).rejects.toThrow(/Family member not found/i);
    });

    it('should handle member with no streaks', async () => {
        // Create family member with no streaks
        const memberResult = await db.insert(familyMembersTable)
            .values({
                name: 'No Streaks Member',
                email: 'nostreaks@example.com'
            })
            .returning()
            .execute();

        const member = memberResult[0];

        const stats = await getFamilyMemberStats(member.id);

        expect(stats.current_streaks).toBe(0);
        expect(stats.longest_streak).toBe(0);
    });

    it('should calculate completion rate as 0 when no tasks assigned', async () => {
        // Create family member
        const memberResult = await db.insert(familyMembersTable)
            .values({
                name: 'No Tasks Member',
                email: 'notasks@example.com'
            })
            .returning()
            .execute();

        const member = memberResult[0];

        // Create task completions for tasks not assigned to this member would require
        // creating other members and tasks, but we just test the empty case

        const stats = await getFamilyMemberStats(member.id);

        expect(stats.completion_rate).toBe(0); // No assigned tasks = 0% completion rate
    });
});