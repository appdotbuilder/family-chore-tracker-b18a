import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { TaskCompletionForm } from '@/components/TaskCompletionForm';
import type { FamilyMember, Task, TaskCompletion, Streak } from '../../../server/src/schema';

interface DashboardProps {
  familyMembers: FamilyMember[];
  tasks: Task[];
  completions: TaskCompletion[];
  streaks: Streak[];
  selectedMember: FamilyMember | null;
  onMemberSelected: (member: FamilyMember) => void;
  onTaskCompleted: (completion: TaskCompletion) => void;
}

export function Dashboard({
  familyMembers,
  tasks,
  completions,
  streaks,
  selectedMember,
  onMemberSelected,
  onTaskCompleted
}: DashboardProps) {
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Calculate stats for selected member
  const memberStats = useMemo(() => {
    if (!selectedMember) return null;

    const memberTasks = tasks.filter((task: Task) => task.assigned_to === selectedMember.id);
    const memberCompletions = completions.filter((c: TaskCompletion) => c.family_member_id === selectedMember.id);
    const memberStreaks = streaks.filter((s: Streak) => s.family_member_id === selectedMember.id);

    // Tasks completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = memberCompletions.filter((c: TaskCompletion) => {
      const completionDate = new Date(c.completed_at);
      completionDate.setHours(0, 0, 0, 0);
      return completionDate.getTime() === today.getTime();
    }).length;

    // Total points earned
    const totalPoints = memberCompletions.reduce((sum: number, completion: TaskCompletion) => {
      const task = tasks.find((t: Task) => t.id === completion.task_id);
      return sum + (task?.points || 0);
    }, 0);

    // Current streaks
    const activeStreaks = memberStreaks.filter((s: Streak) => s.current_streak > 0);

    return {
      totalTasks: memberTasks.length,
      completedToday,
      totalCompletions: memberCompletions.length,
      totalPoints,
      activeStreaks: activeStreaks.length,
      longestStreak: Math.max(...memberStreaks.map((s: Streak) => s.longest_streak), 0)
    };
  }, [selectedMember, tasks, completions, streaks]);

  // Get pending tasks for selected member
  const pendingTasks = useMemo(() => {
    if (!selectedMember) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter((task: Task) => {
      if (!task.is_active || task.assigned_to !== selectedMember.id) return false;

      // Check if task was already completed today
      const completedToday = completions.some((c: TaskCompletion) => {
        const completionDate = new Date(c.completed_at);
        completionDate.setHours(0, 0, 0, 0);
        return c.task_id === task.id && 
               c.family_member_id === selectedMember.id && 
               completionDate.getTime() === today.getTime() &&
               (c.status === 'completed' || c.status === 'verified');
      });

      return !completedToday;
    });
  }, [selectedMember, tasks, completions]);

  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
    setShowCompletionForm(true);
  };

  const handleTaskCompleted = (completion: TaskCompletion) => {
    onTaskCompleted(completion);
    setShowCompletionForm(false);
    setSelectedTask(null);
  };

  const getTaskTypeEmoji = (taskType: string) => {
    switch (taskType) {
      case 'habit': return '🔄';
      case 'chore': return '🧹';
      case 'daily': return '📅';
      case 'weekly': return '📆';
      default: return '📝';
    }
  };

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'habit': return 'bg-blue-100 text-blue-800';
      case 'chore': return 'bg-green-100 text-green-800';
      case 'daily': return 'bg-yellow-100 text-yellow-800';
      case 'weekly': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Family Member Selector */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👨‍👩‍👧‍👦 Select Family Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {familyMembers.map((member: FamilyMember) => (
              <Button
                key={member.id}
                variant={selectedMember?.id === member.id ? "default" : "outline"}
                onClick={() => onMemberSelected(member)}
                className="flex items-center gap-2"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {member.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedMember && memberStats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{memberStats.completedToday}</div>
                <div className="text-blue-100 text-sm">Completed Today</div>
                <div className="text-3xl mt-2">✅</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{memberStats.totalPoints}</div>
                <div className="text-green-100 text-sm">Total Points</div>
                <div className="text-3xl mt-2">⭐</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{memberStats.activeStreaks}</div>
                <div className="text-orange-100 text-sm">Active Streaks</div>
                <div className="text-3xl mt-2">🔥</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{memberStats.longestStreak}</div>
                <div className="text-purple-100 text-sm">Longest Streak</div>
                <div className="text-3xl mt-2">🏆</div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Tasks */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  📋 Pending Tasks for {selectedMember.name}
                </span>
                <Badge variant="secondary">
                  {pendingTasks.length} remaining
                </Badge>
              </CardTitle>
              <CardDescription>
                Complete these tasks to earn points and build streaks!
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-semibold text-green-700 mb-2">
                    All tasks completed for today!
                  </h3>
                  <p className="text-muted-foreground">
                    Great job! Check back tomorrow for more tasks.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTasks.map((task: Task) => {
                    const streak = streaks.find((s: Streak) => 
                      s.task_id === task.id && s.family_member_id === selectedMember.id
                    );

                    return (
                      <Card key={task.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">
                                  {getTaskTypeEmoji(task.task_type)}
                                </span>
                                <div>
                                  <h4 className="font-semibold">{task.title}</h4>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge className={getTaskTypeColor(task.task_type)}>
                                  {task.task_type}
                                </Badge>
                                <Badge variant="outline">
                                  {task.frequency}
                                </Badge>
                                <span className="text-sm font-medium text-green-600">
                                  +{task.points} points
                                </span>
                                {streak && streak.current_streak > 0 && (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                    🔥 {streak.current_streak} day streak
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button 
                              onClick={() => handleCompleteTask(task)}
                              className="ml-4"
                            >
                              Complete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Completion Form Dialog */}
          {showCompletionForm && selectedTask && selectedMember && (
            <TaskCompletionForm
              task={selectedTask}
              familyMember={selectedMember}
              onTaskCompleted={handleTaskCompleted}
              onCancel={() => {
                setShowCompletionForm(false);
                setSelectedTask(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}