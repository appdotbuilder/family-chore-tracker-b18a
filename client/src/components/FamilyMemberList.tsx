import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { FamilyMember, CreateFamilyMemberInput } from '../../../server/src/schema';

interface FamilyMemberListProps {
  familyMembers: FamilyMember[];
  onMemberAdded: (member: FamilyMember) => void;
  selectedMember: FamilyMember | null;
  onMemberSelected: (member: FamilyMember) => void;
}

export function FamilyMemberList({
  familyMembers,
  onMemberAdded,
  selectedMember,
  onMemberSelected
}: FamilyMemberListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<CreateFamilyMemberInput>({
    name: '',
    email: '',
    avatar_url: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setIsLoading(true);
    try {
      const response = await trpc.createFamilyMember.mutate(formData);
      onMemberAdded(response);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        avatar_url: null
      });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to create family member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                👨‍👩‍👧‍👦 Family Members
              </CardTitle>
              <CardDescription>
                Manage your family members and track their progress
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  ➕ Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    👤 Add New Family Member
                  </DialogTitle>
                  <DialogDescription>
                    Add a new family member to start tracking their chores and habits.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter family member's name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateFamilyMemberInput) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateFamilyMemberInput) => ({ ...prev, email: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="avatar">Avatar URL (optional)</Label>
                      <Input
                        id="avatar"
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        value={formData.avatar_url || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateFamilyMemberInput) => ({
                            ...prev,
                            avatar_url: e.target.value || null
                          }))
                        }
                      />
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
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Adding...' : '👤 Add Member'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {familyMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                No family members yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Add your first family member to get started with tracking chores and habits!
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                ➕ Add First Member
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {familyMembers.map((member: FamilyMember) => (
                <Card
                  key={member.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedMember?.id === member.id
                      ? 'ring-2 ring-indigo-500 bg-indigo-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onMemberSelected(member)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{member.name}</h4>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Joined: {member.created_at.toLocaleDateString()}
                        </p>
                      </div>
                      {selectedMember?.id === member.id && (
                        <Badge className="bg-indigo-100 text-indigo-700">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}