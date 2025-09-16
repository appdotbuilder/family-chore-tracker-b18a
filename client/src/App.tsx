import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import './App.css';
import { FamilyMemberList } from '@/components/FamilyMemberList';
import { TaskList } from '@/components/TaskList';
import { TaskCompletionList } from '@/components/TaskCompletionList';
import { Dashboard } from '@/components/Dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Using type-only imports for better TypeScript compliance
import type { FamilyMember, Task, TaskCompletion, Streak } from '../../server/src/schema';

function App() {
  // State management with explicit typing
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load family members with useCallback
  const loadFamilyMembers = useCallback(async () => {
    try {
      const result = await trpc.getFamilyMembers.query();
      setFamilyMembers(result);
      if (result.length > 0 && !selectedMember) {
        setSelectedMember(result[0]);
      }
    } catch (error) {
      console.error('Failed to load family members:', error);
    }
  }, [selectedMember]);

  // Load tasks with useCallback
  const loadTasks = useCallback(async () => {
    try {
      const result = await trpc.getTasks.query();
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, []);

  // Load task completions with useCallback
  const loadCompletions = useCallback(async () => {
    try {
      const result = await trpc.getTaskCompletions.query({});
      setCompletions(result);
    } catch (error) {
      console.error('Failed to load completions:', error);
    }
  }, []);

  // Load streaks with useCallback
  const loadStreaks = useCallback(async () => {
    try {
      const result = await trpc.getStreaks.query({});
      setStreaks(result);
    } catch (error) {
      console.error('Failed to load streaks:', error);
    }
  }, []);

  // useEffect with proper dependencies
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadFamilyMembers(),
          loadTasks(),
          loadCompletions(),
          loadStreaks()
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllData();
  }, [loadFamilyMembers, loadTasks, loadCompletions, loadStreaks]);

  // Handler for adding new family member
  const handleFamilyMemberAdded = useCallback((newMember: FamilyMember) => {
    setFamilyMembers((prev: FamilyMember[]) => [...prev, newMember]);
    if (!selectedMember) {
      setSelectedMember(newMember);
    }
  }, [selectedMember]);

  // Handler for adding new task
  const handleTaskAdded = useCallback((newTask: Task) => {
    setTasks((prev: Task[]) => [...prev, newTask]);
  }, []);

  // Handler for task completion
  const handleTaskCompleted = useCallback((newCompletion: TaskCompletion) => {
    setCompletions((prev: TaskCompletion[]) => [...prev, newCompletion]);
    // Refresh streaks when a task is completed
    loadStreaks();
  }, [loadStreaks]);

  if (isLoading) {
    return (
      <div className="app-background flex items-center justify-center">
        <Card className="w-96 card-hover">
          <CardContent className="p-8 text-center">
            <div className="text-4xl emoji-bounce">🏠</div>
            <p className="mt-4 text-muted-foreground">Loading your family chore tracker...</p>
            <div className="mt-4 loading-shimmer h-2 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-background">
      <div className="container mx-auto p-4">
        {/* Header */}
        <Card className="mb-6 border-none shadow-lg bg-white/80 backdrop-blur-sm card-hover">
          <CardHeader className="text-center">
            <div className="text-6xl mb-2 emoji-bounce">🏠</div>
            <CardTitle className="text-3xl font-bold text-indigo-900">
              Family Chore Tracker
            </CardTitle>
            <CardDescription className="text-lg text-indigo-700">
              Track habits, chores, and build amazing streaks together! 🌟
            </CardDescription>
          </CardHeader>
        </Card>

        {familyMembers.length === 0 ? (
          <Card className="border-dashed border-2 border-indigo-300 bg-white/60">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-2xl font-bold text-indigo-900 mb-2">
                Welcome to Your Family Chore Tracker!
              </h3>
              <p className="text-indigo-700 mb-6">
                Start by adding your family members to begin tracking chores and building habits together.
              </p>
              <FamilyMemberList
                familyMembers={familyMembers}
                onMemberAdded={handleFamilyMemberAdded}
                selectedMember={selectedMember}
                onMemberSelected={setSelectedMember}
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm">
              <TabsTrigger value="dashboard" className="text-sm">
                📊 Dashboard
              </TabsTrigger>
              <TabsTrigger value="family" className="text-sm">
                👨‍👩‍👧‍👦 Family
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-sm">
                📝 Tasks
              </TabsTrigger>
              <TabsTrigger value="completions" className="text-sm">
                ✅ Completions
              </TabsTrigger>
              <TabsTrigger value="streaks" className="text-sm">
                🔥 Streaks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <Dashboard
                familyMembers={familyMembers}
                tasks={tasks}
                completions={completions}
                streaks={streaks}
                selectedMember={selectedMember}
                onMemberSelected={setSelectedMember}
                onTaskCompleted={handleTaskCompleted}
              />
            </TabsContent>

            <TabsContent value="family">
              <FamilyMemberList
                familyMembers={familyMembers}
                onMemberAdded={handleFamilyMemberAdded}
                selectedMember={selectedMember}
                onMemberSelected={setSelectedMember}
              />
            </TabsContent>

            <TabsContent value="tasks">
              <TaskList
                tasks={tasks}
                familyMembers={familyMembers}
                onTaskAdded={handleTaskAdded}
                selectedMember={selectedMember}
              />
            </TabsContent>

            <TabsContent value="completions">
              <TaskCompletionList
                completions={completions}
                tasks={tasks}
                familyMembers={familyMembers}
                selectedMember={selectedMember}
                onTaskCompleted={handleTaskCompleted}
              />
            </TabsContent>

            <TabsContent value="streaks">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🔥 Family Streaks
                  </CardTitle>
                  <CardDescription>
                    Keep the momentum going! Here are your family's current streaks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {streaks.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">🌱</div>
                      <p className="text-muted-foreground">
                        No streaks yet. Complete some tasks to start building streaks! 
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {streaks.map((streak: Streak) => {
                        const member = familyMembers.find((m: FamilyMember) => m.id === streak.family_member_id);
                        const task = tasks.find((t: Task) => t.id === streak.task_id);
                        
                        return (
                          <Card key={streak.id} className="border-l-4 border-l-orange-500">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {member?.name || 'Unknown Member'} • {task?.title || 'Unknown Task'}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    Last completed: {streak.last_completion_date?.toLocaleDateString() || 'Never'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2 text-orange-600 font-bold">
                                    🔥 {streak.current_streak} days
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Best: {streak.longest_streak} days
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default App;