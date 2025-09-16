import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import type { Task, FamilyMember, CreateTaskInput, TaskType, Frequency } from '../../../server/src/schema';

interface TaskListProps {
  tasks: Task[];
  familyMembers: FamilyMember[];
  onTaskAdded: (task: Task) => void;
  selectedMember: FamilyMember | null;
}

export function TaskList({
  tasks,
  familyMembers,
  onTaskAdded,
  selectedMember
}: TaskListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: null,
    task_type: 'chore',
    frequency: 'daily',
    points: 10,
    assigned_to: selectedMember?.id || 0,
    created_by: selectedMember?.id || 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.assigned_to || !formData.created_by) return;

    setIsLoading(true);
    try {
      const response = await trpc.createTask.mutate(formData);
      onTaskAdded(response);
      
      // Reset form
      setFormData({
        title: '',
        description: null,
        task_type: 'chore',
        frequency: 'daily',
        points: 10,
        assigned_to: selectedMember?.id || 0,
        created_by: selectedMember?.id || 0
      });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (task: Task) => {
    try {
      await trpc.updateTask.mutate({
        id: task.id,
        is_active: !task.is_active
      });
      // Note: In a real app, you'd want to update the local state or refetch
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const getTaskTypeEmoji = (taskType: TaskType) => {
    switch (taskType) {
      case 'habit': return '🔄';
      case 'chore': return '🧹';
      case 'daily': return '📅';
      case 'weekly': return '📆';
      default: return '📝';
    }
  };

  const getTaskTypeColor = (taskType: TaskType) => {
    switch (taskType) {
      case 'habit': return 'bg-blue-100 text-blue-800';
      case 'chore': return 'bg-green-100 text-green-800';
      case 'daily': return 'bg-yellow-100 text-yellow-800';
      case 'weekly': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter tasks based on selected filters
  const filteredTasks = tasks.filter((task: Task) => {
    const memberFilter = filterMember === 'all' || task.assigned_to.toString() === filterMember;
    const typeFilter = filterType === 'all' || task.task_type === filterType;
    return memberFilter && typeFilter;
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📝 Family Tasks
              </CardTitle>
              <CardDescription>
                Create and manage tasks, chores, and habits for your family
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  ➕ Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    📝 Create New Task
                  </DialogTitle>
                  <DialogDescription>
                    Create a new task, chore, or habit for a family member.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Enter task title"
                        value={formData.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
                        }
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Optional task description"
                        value={formData.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData((prev: CreateTaskInput) => ({
                            ...prev,
                            description: e.target.value || null
                          }))
                        }
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="taskType">Type *</Label>
                        <Select
                          value={formData.task_type}
                          onValueChange={(value: TaskType) =>
                            setFormData((prev: CreateTaskInput) => ({ ...prev, task_type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="habit">🔄 Habit</SelectItem>
                            <SelectItem value="chore">🧹 Chore</SelectItem>
                            <SelectItem value="daily">📅 Daily</SelectItem>
                            <SelectItem value="weekly">📆 Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="frequency">Frequency *</Label>
                        <Select
                          value={formData.frequency}
                          onValueChange={(value: Frequency) =>
                            setFormData((prev: CreateTaskInput) => ({ ...prev, frequency: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="points">Points *</Label>
                      <Input
                        id="points"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.points}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateTaskInput) => ({ 
                            ...prev, 
                            points: parseInt(e.target.value) || 10 
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="assignedTo">Assigned To *</Label>
                        <Select
                          value={formData.assigned_to > 0 ? formData.assigned_to.toString() : ''}
                          onValueChange={(value: string) =>
                            setFormData((prev: CreateTaskInput) => ({ 
                              ...prev, 
                              assigned_to: parseInt(value) 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                          <SelectContent>
                            {familyMembers.map((member: FamilyMember) => (
                              <SelectItem key={member.id} value={member.id.toString()}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="createdBy">Created By *</Label>
                        <Select
                          value={formData.created_by > 0 ? formData.created_by.toString() : ''}
                          onValueChange={(value: string) =>
                            setFormData((prev: CreateTaskInput) => ({ 
                              ...prev, 
                              created_by: parseInt(value) 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                          <SelectContent>
                            {familyMembers.map((member: FamilyMember) => (
                              <SelectItem key={member.id} value={member.id.toString()}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading || familyMembers.length === 0}>
                      {isLoading ? 'Creating...' : '📝 Create Task'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label>Filter by Member</Label>
              <Select value={filterMember} onValueChange={setFilterMember}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {familyMembers.map((member: FamilyMember) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label>Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="habit">🔄 Habits</SelectItem>
                  <SelectItem value="chore">🧹 Chores</SelectItem>
                  <SelectItem value="daily">📅 Daily</SelectItem>
                  <SelectItem value="weekly">📆 Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                No tasks found
              </h3>
              <p className="text-muted-foreground mb-4">
                {tasks.length === 0 
                  ? "Create your first task to get started!" 
                  : "Try adjusting your filters or create a new task."}
              </p>
              {familyMembers.length > 0 && (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ➕ Create First Task
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task: Task) => {
                const assignedMember = familyMembers.find((m: FamilyMember) => m.id === task.assigned_to);
                const createdByMember = familyMembers.find((m: FamilyMember) => m.id === task.created_by);

                return (
                  <Card key={task.id} className={`border-l-4 ${
                    task.is_active ? 'border-l-green-500' : 'border-l-gray-400'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">
                              {getTaskTypeEmoji(task.task_type)}
                            </span>
                            <div>
                              <h4 className="font-semibold flex items-center gap-2">
                                {task.title}
                                {!task.is_active && (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </h4>
                              {task.description && (
                                <p className="text-sm text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <Badge className={getTaskTypeColor(task.task_type)}>
                              {task.task_type}
                            </Badge>
                            <Badge variant="outline">
                              {task.frequency}
                            </Badge>
                            <span className="text-sm font-medium text-green-600">
                              +{task.points} points
                            </span>
                            
                            {assignedMember && (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={assignedMember.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {assignedMember.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">
                                  {assignedMember.name}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground">
                            Created by {createdByMember?.name || 'Unknown'} on{' '}
                            {task.created_at.toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={task.is_active}
                              onCheckedChange={() => handleToggleActive(task)}
                            />
                            <Label className="text-sm">Active</Label>
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
    </div>
  );
}