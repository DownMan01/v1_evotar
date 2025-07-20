import { useState } from 'react';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddCandidateForm } from '@/components/AddCandidateForm';
import { CandidateCard } from '@/components/CandidateCard';
import { EditCandidateForm } from '@/components/EditCandidateForm';
import { useOptimizedCandidates } from '@/hooks/useOptimizedCandidates';
import { CandidatesSkeleton } from '@/components/LoadingSkeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, RefreshCw, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
interface Candidate {
  id: string;
  full_name: string;
  bio: string | null;
  image_url: string | null;
  position_title: string;
  election_title: string;
  election_status: string;
  election_id: string;
  position_id: string;
  why_vote_me?: string | null;
  jhs_school?: string | null;
  jhs_graduation_year?: number | null;
  shs_school?: string | null;
  shs_graduation_year?: number | null;
  partylist?: string | null;
}
export const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [expandedElections, setExpandedElections] = useState<Set<string>>(new Set());
  const {
    profile,
    canViewCandidatesForElection
  } = usePermissions();
  const {
    toast
  } = useToast();
  const {
    candidates,
    loading,
    error,
    refetch
  } = useOptimizedCandidates({
    searchTerm
  });

  // Filter candidates based on permissions
  const filteredCandidates = candidates.filter(candidate => canViewCandidatesForElection(candidate.election_status));

  // Group candidates by election and sort by position
  const candidatesByElection = filteredCandidates.reduce((acc, candidate) => {
    const key = `${candidate.election_id}-${candidate.election_title}`;
    if (!acc[key]) {
      acc[key] = {
        election_id: candidate.election_id,
        election_title: candidate.election_title,
        election_status: candidate.election_status,
        candidates: []
      };
    }
    acc[key].candidates.push(candidate);
    return acc;
  }, {} as Record<string, {
    election_id: string;
    election_title: string;
    election_status: string;
    candidates: Candidate[];
  }>);

  // Sort candidates by position within each election
  Object.keys(candidatesByElection).forEach(key => {
    candidatesByElection[key].candidates.sort((a, b) => a.position_title.localeCompare(b.position_title));
  });

  // Initialize expanded elections to show all elections open by default
  React.useEffect(() => {
    if (Object.keys(candidatesByElection).length > 0) {
      setExpandedElections(new Set(Object.keys(candidatesByElection)));
    }
  }, [JSON.stringify(Object.keys(candidatesByElection))]);
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };
  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      const {
        error
      } = await supabase.from('candidates').delete().eq('id', candidateId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Candidate deleted successfully"
      });
      refetch();
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      toast({
        title: "Error",
        description: "Failed to delete candidate",
        variant: "destructive"
      });
    }
  };
  const toggleElectionExpanded = (electionKey: string) => {
    const newExpanded = new Set(expandedElections);
    if (newExpanded.has(electionKey)) {
      newExpanded.delete(electionKey);
    } else {
      newExpanded.add(electionKey);
    }
    setExpandedElections(newExpanded);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Upcoming':
        return 'bg-blue-500';
      case 'Completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };
  if (loading && candidates.length === 0) {
    return <CandidatesSkeleton />;
  }
  return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Candidates</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {(profile?.role === 'Staff' || profile?.role === 'Administrator') && <AddCandidateForm />}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        <Input placeholder="Search candidates by name, position, election, or bio..." value={searchTerm} onChange={e => handleSearchChange(e.target.value)} className="pl-10" />
      </div>

      {error && <div className="text-center py-8">
          <p className="text-destructive mb-2">Failed to load candidates</p>
          <Button onClick={refetch} variant="outline">
            Try Again
          </Button>
        </div>}

      {!loading && Object.keys(candidatesByElection).length === 0 ? <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              {searchTerm ? 'No candidates match your search' : 'No candidates available'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'Candidates will appear here when elections are created'}
            </p>
          </CardContent>
        </Card> : <div className="space-y-6">
          {Object.entries(candidatesByElection).map(([electionKey, electionData]) => {
        const isExpanded = expandedElections.has(electionKey);
        return <Card key={electionKey} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleElectionExpanded(electionKey)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <CardTitle className="text-xl">{electionData.election_title}</CardTitle>
                          <Badge className={`${getStatusColor(electionData.election_status)} text-white`}>
                            {electionData.election_status}
                          </Badge>
                          <Badge variant="outline">
                            {electionData.candidates.length} candidate{electionData.candidates.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {electionData.candidates.map(candidate => <div key={candidate.id} className="relative group">
                            <CandidateCard candidate={candidate} showElectionInfo={false} />
                            
                            {/* Action buttons for staff/admin */}
                            {(profile?.role === 'Staff' || profile?.role === 'Administrator') && <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="outline" className="h-8 w-8 bg-background/90 backdrop-blur-sm" onClick={() => setEditingCandidate(candidate)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                {/* Delete button for both staff and administrators */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="outline" className="h-8 w-8 bg-background/90 backdrop-blur-sm text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete {candidate.full_name}? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteCandidate(candidate.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                              </div>}
                          </div>)}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>;
      })}
        </div>}

      {/* Edit Candidate Modal */}
      {editingCandidate && <EditCandidateForm candidate={editingCandidate} open={!!editingCandidate} onClose={() => setEditingCandidate(null)} onSuccess={() => {
      setEditingCandidate(null);
      refetch();
    }} />}
    </div>;
};