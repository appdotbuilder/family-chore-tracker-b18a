import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Task, FamilyMember, TaskCompletion, CreateTaskCompletionInput } from '../../../server/src/schema';

interface TaskCompletionFormProps {
  task: Task;
  familyMember: FamilyMember;
  onTaskCompleted: (completion: TaskCompletion) => void;
  onCancel: () => void;
}

export function TaskCompletionForm({
  task,
  familyMember,
  onTaskCompleted,
  onCancel
}: TaskCompletionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTaskCompletionInput>({
    task_id: task.id,
    family_member_id: familyMember.id,
    proof_image_url: null,
    notes: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await trpc.completeTask.mutate(formData);
      onTaskCompleted(response);
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setIsLoading(false);
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
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✅ Complete Task
          </DialogTitle>
          <DialogDescription>
            Mark this task as completed and optionally add proof and notes.
          </DialogDescription>
        </DialogHeader>

        {/* Task Details */}
        <div className="bg-gray-50 rounded-lg p-4 my-4">
          <div className="flex items-center gap-3 mb-3">
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
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Avatar className="w-6 h-6">
              <AvatarImage src={familyMember.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {familyMember.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {familyMember.name}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="proof">Proof Image URL (optional)</Label>
              <Input
                id="proof"
                type="url"
                placeholder="https://example.com/proof-image.jpg"
                value={formData.proof_image_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateTaskCompletionInput) => ({
                    ...prev,
                    proof_image_url: e.target.value || null
                  }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                📸 Upload a photo as proof of completion (optional)
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about completing this task..."
                value={formData.notes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateTaskCompletionInput) => ({
                    ...prev,
                    notes: e.target.value || null
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Completing...' : '✅ Complete Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}