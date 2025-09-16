import { useState, useMemo } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { TaskCompletion, Task, FamilyMember, TaskStatus } from '../../../server/src/schema';

interface TaskCompletionListProps {
  completions: TaskCompletion[];
  tasks: Task[];
  familyMembers: FamilyMember[];
  selectedMember: FamilyMember | null;
  onTaskCompleted: (completion: TaskCompletion) => void;
}

export function TaskCompletionList({
  completions,
  tasks,
  familyMembers,
  selectedMember
}: TaskCompletionListProps) {
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isVerifying, setIsVerifying] = useState<number | null>(null);

  // Filter completions based on selected filters
  const filteredCompletions = useMemo(() => {
    return completions.filter((completion: TaskCompletion) => {
      const memberFilter = filterMember === 'all' || completion.family_member_id.toString() === filterMember;
      const statusFilter = filterStatus === 'all' || completion.status === filterStatus;
      return memberFilter && statusFilter;
    }).sort((a: TaskCompletion, b: TaskCompletion) => 
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );
  }, [completions, filterMember, filterStatus]);

  const handleVerifyCompletion = async (completion: TaskCompletion, status: TaskStatus) => {
    if (!selectedMember) return;

    setIsVerifying(completion.id);
    try {
      await trpc.verifyTaskCompletion.mutate({
        completion_id: completion.id,
        verified_by: selectedMember.id,
        status
      });
      // Note: In a real app, you'd want to update the local state or refetch
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Failed to verify completion:', error);
    } finally {
      setIsVerifying(null);
    }
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

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">⏳ Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✅ Completed</Badge>;
      case 'verified':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">🏆 Verified</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ✅ Task Completions
          </CardTitle>
          <CardDescription>
            View and verify completed tasks by family members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
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

            <div>
              <Label>Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                  <SelectItem value="verified">🏆 Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                Showing {filteredCompletions.length} completion{filteredCompletions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Completions List */}
          {filteredCompletions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                No completions found
              </h3>
              <p className="text-muted-foreground">
                {completions.length === 0 
                  ? "Complete some tasks to see them here!" 
                  : "Try adjusting your filters to see more completions."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCompletions.map((completion: TaskCompletion) => {
                const member = familyMembers.find((m: FamilyMember) => m.id === completion.family_member_id);
                const task = tasks.find((t: Task) => t.id === completion.task_id);
                const verifiedByMember = completion.verified_by 
                  ? familyMembers.find((m: FamilyMember) => m.id === completion.verified_by)
                  : null;

                return (
                  <Card key={completion.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">
                              {task ? getTaskTypeEmoji(task.task_type) : '📝'}
                            </span>
                            <div>
                              <h4 className="font-semibold">
                                {task?.title || 'Unknown Task'}
                              </h4>
                              {task?.description && (
                                <p className="text-sm text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mb-2">
                            {member && (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={member.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {member.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">
                                  {member.name}
                                </span>
                              </div>
                            )}
                            
                            {getStatusBadge(completion.status)}

                            {task && (
                              <span className="text-sm font-medium text-green-600">
                                +{task.points} points
                              </span>
                            )}
                          </div>

                          {completion.notes && (
                            <div className="bg-gray-50 rounded p-2 mb-2">
                              <p className="text-sm text-gray-700">
                                💬 {completion.notes}
                              </p>
                            </div>
                          )}

                          {completion.proof_image_url && (
                            <div className="mb-2">
                              <a 
                                href={completion.proof_image_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                              >
                                📸 View Proof Image
                              </a>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Completed: {completion.completed_at.toLocaleDateString()} at{' '}
                            {completion.completed_at.toLocaleTimeString()}
                            {verifiedByMember && completion.verified_at && (
                              <>
                                <br />
                                Verified by {verifiedByMember.name} on{' '}
                                {completion.verified_at.toLocaleDateString()}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Verification Actions */}
                        {completion.status === 'completed' && selectedMember && (
                          <div className="flex gap-2 ml-4">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  disabled={isVerifying === completion.id}
                                >
                                  🏆 Verify
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Verify Task Completion</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to verify this task completion? 
                                    This will award the points and update the streak.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleVerifyCompletion(completion, 'verified')}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    🏆 Verify
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
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