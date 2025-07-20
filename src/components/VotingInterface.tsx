import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Vote, Check, AlertCircle } from 'lucide-react';

interface Candidate {
  id: string;
  full_name: string;
  bio: string | null;
  image_url: string | null;
  position_id: string;
}

interface Position {
  id: string;
  title: string;
  description: string | null;
  candidates: Candidate[];
}

interface Election {
  id: string;
  title: string;
  description: string | null;
  status: string;
  positions: Position[];
}

interface VotingInterfaceProps {
  election: Election;
  onVoteComplete: () => void;
}

export const VotingInterface = ({ election, onVoteComplete }: VotingInterfaceProps) => {
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { canVote } = usePermissions();

  useEffect(() => {
    const checkVoteStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('votes')
        .select('id')
        .eq('election_id', election.id)
        .eq('voter_id', user.id)
        .single();
      
      if (data) setHasVoted(true);
    };
    checkVoteStatus();
  }, [election.id]);

  const handleCandidateSelect = (positionId: string, candidateId: string) => {
    setSelectedCandidates(prev => ({
      ...prev,
      [positionId]: candidateId
    }));
  };

  const handleSubmitVotes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create voting session first
      const { data: sessionResult, error: sessionError } = await supabase.rpc('create_voting_session_safe', {
        p_election_id: election.id
      });

      const sessionData = sessionResult as { success: boolean; error: string | null; session_token: string | null };

      if (sessionError || !sessionData?.success) {
        throw new Error(sessionData?.error || 'Failed to create voting session');
      }

      // Submit votes using the anonymous voting function
      for (const [positionId, candidateId] of Object.entries(selectedCandidates)) {
        const { data: voteResult, error: voteError } = await supabase.rpc('cast_anonymous_vote', {
          p_session_token: sessionData.session_token,
          p_candidate_id: candidateId,
          p_election_id: election.id,
          p_position_id: positionId
        });

        if (voteError || !voteResult) {
          throw new Error(`Failed to cast vote for position ${positionId}`);
        }
      }
      
      setShowConfirmDialog(false);
      onVoteComplete();
    } catch (error: any) {
      console.error('Failed to submit votes:', error);
      alert(error.message || 'Failed to submit votes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!canVote) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            You don't have permission to vote. Only approved voters can participate in elections.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (hasVoted) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Vote Already Cast</h3>
          <p className="text-muted-foreground">You have already voted in this election.</p>
        </CardContent>
      </Card>
    );
  }

  if (election.status !== 'Active') {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {election.status === 'Upcoming' ? 'Voting has not started yet.' : 'Voting has ended.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const allPositionsSelected = election.positions.every(position => 
    selectedCandidates[position.id]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Cast Your Vote: {election.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select one candidate for each position. Your vote will be recorded securely.
          </p>
        </CardHeader>
      </Card>

      {election.positions.map((position) => (
        <Card key={position.id}>
          <CardHeader>
            <CardTitle className="text-lg">{position.title}</CardTitle>
            {position.description && (
              <p className="text-sm text-muted-foreground">{position.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {position.candidates.map((candidate) => {
                const isSelected = selectedCandidates[position.id] === candidate.id;
                return (
                  <Card
                    key={candidate.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleCandidateSelect(position.id, candidate.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <Avatar className="h-16 w-16 mx-auto mb-3">
                        <AvatarImage src={candidate.image_url || undefined} alt={candidate.full_name} />
                        <AvatarFallback>
                          {getInitials(candidate.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <h4 className="font-medium mb-1">{candidate.full_name}</h4>
                      {candidate.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{candidate.bio}</p>
                      )}
                      {isSelected && (
                        <Badge className="mt-2">
                          <Check className="h-3 w-3 mr-1" />
                          Selected
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!allPositionsSelected || loading}
            size="lg"
            className="w-full sm:w-auto mx-auto flex items-center justify-center gap-2"
          >
            <Vote className="h-4 w-4" />
            Submit My Votes
          </Button>

          {!allPositionsSelected && (
            <p className="text-sm text-destructive font-medium">
              Please select a candidate for each position to continue.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Votes</DialogTitle>
            <DialogDescription className="text-red-600">
              Please review your selections before submitting. Once submitted, your votes cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {election.positions.map((position) => {
              const selectedCandidate = position.candidates.find(
                c => c.id === selectedCandidates[position.id]
              );
              return (
                <div key={position.id} className="flex justify-between items-center">
                  <span className="font-medium">{position.title}:</span>
                  <span className="text-muted-foreground">
                    {selectedCandidate?.full_name}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Review Again
            </Button>
            <Button onClick={handleSubmitVotes} disabled={loading}>
              {loading ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};