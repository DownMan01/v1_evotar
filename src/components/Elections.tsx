import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { usePendingActions } from '@/hooks/usePendingActions';
import { useOptimizedElections } from '@/hooks/useOptimizedElections';
import { VotingInterface } from '@/components/VotingInterface';
import { CandidateCard } from '@/components/CandidateCard';
import { CreateElectionForm } from '@/components/CreateElectionForm';
import { ElectionsSkeleton } from '@/components/LoadingSkeleton';
import { PaginationControls } from '@/components/PaginationControls';
import { Calendar, Clock, Users, Vote, BarChart3, Search, MapPin, RefreshCw, Eye } from 'lucide-react';
interface Election {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  eligible_voters: string | null;
  cover_image_url: string | null;
  show_results_to_voters: boolean;
}
export const Elections = () => {
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [showVotingDialog, setShowVotingDialog] = useState(false);
  const [showCandidatesDialog, setShowCandidatesDialog] = useState(false);
  const [electionCandidates, setElectionCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const { canViewResults, canViewElection, isStaff, canVote, canManageElections } = usePermissions();
  const { publishResultsRequest } = usePendingActions();
  
  const itemsPerPage = 6;
  const offset = (currentPage - 1) * itemsPerPage;

  const { 
    elections, 
    loading, 
    error, 
    totalCount, 
    refetch, 
    hasNextPage, 
    hasPreviousPage 
  } = useOptimizedElections({
    limit: itemsPerPage,
    offset,
    status: statusFilter,
    refetchInterval: 0, // Disable auto-polling
    userRole: isStaff || canManageElections ? 'Admin' : 'Voter'
  });

  // Filter by search term only (permissions already handled in query)
  const filteredElections = elections.filter(election => {
    const matchesSearch = !searchTerm || 
      election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      election.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      election.eligible_voters?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-success text-success-foreground';
      case 'Upcoming':
        return 'bg-primary text-primary-foreground';
      case 'Completed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const handleStartVoting = async (election: Election) => {
    if (!canVote) {
      console.error('User does not have voting permissions');
      return;
    }

    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    // Use the new safe voting session function
    const { data: sessionResult, error: sessionError } = await supabase.rpc('create_voting_session_safe', {
      p_election_id: election.id
    });
    
    const result = sessionResult as { success: boolean; error: string | null; session_token: string | null };
    
    if (sessionError || !result?.success) {
      console.error('Cannot create voting session:', sessionError || result?.error);
      return;
    }

    // Fetch election with positions and candidates
    const { data, error } = await supabase
      .from('elections')
      .select(`
        *,
        positions (
          id,
          title,
          description,
          candidates (
            id,
            full_name,
            bio,
            image_url,
            position_id
          )
        )
      `)
      .eq('id', election.id)
      .single();
      
    if (error) {
      console.error('Failed to fetch election details:', error);
      return;
    }
    
    setSelectedElection(data);
    setShowVotingDialog(true);
  };
  const handleViewCandidates = async (election: Election) => {
    try {
      // Fetch candidates for this election with their position information
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          id,
          full_name,
          bio,
          image_url,
          why_vote_me,
          jhs_school,
          jhs_graduation_year,
          shs_school,
          shs_graduation_year,
          partylist,
          positions!candidates_position_id_fkey(
            title
          )
        `)
        .eq('election_id', election.id);
        
      if (error) {
        console.error('Failed to fetch candidates:', error);
        return;
      }
      
      const formattedCandidates = data?.map((candidate: any) => ({
        id: candidate.id,
        full_name: candidate.full_name,
        bio: candidate.bio,
        image_url: candidate.image_url,
        why_vote_me: candidate.why_vote_me,
        jhs_school: candidate.jhs_school,
        jhs_graduation_year: candidate.jhs_graduation_year,
        shs_school: candidate.shs_school,
        shs_graduation_year: candidate.shs_graduation_year,
        partylist: candidate.partylist,
        position_title: candidate.positions?.title || 'Unknown Position',
        election_title: election.title,
        election_status: election.status
      })) || [];
      
      setElectionCandidates(formattedCandidates);
      setSelectedElection(election);
      setShowCandidatesDialog(true);
    } catch (error) {
      console.error('Error viewing candidates:', error);
    }
  };

  const handleVoteComplete = () => {
    setShowVotingDialog(false);
    setSelectedElection(null);
    // Optionally refresh elections list
  };
  if (loading && elections.length === 0) {
    return <ElectionsSkeleton />;
  }
  return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Elections</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Elections</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Upcoming">Upcoming</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <CreateElectionForm />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          placeholder="Search elections by title, description, or eligible voters..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {error && (
        <div className="text-center py-8">
          <p className="text-destructive mb-2">Failed to load elections</p>
          <Button onClick={refetch} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {!loading && filteredElections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              {searchTerm ? 'No elections match your search' : statusFilter === 'all' ? 'No elections available' : `No ${statusFilter.toLowerCase()} elections`}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'Check back later for upcoming elections'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6">
            {filteredElections.map(election => (
              <Card key={election.id} className="overflow-hidden">
                {election.cover_image_url && (
                  <div className="relative h-48 w-full">
                    <img 
                      src={election.cover_image_url} 
                      alt={election.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3 mb-2">
                        <span className="text-xl font-semibold">{election.title}</span>
                        <Badge className={getStatusColor(election.status)}>
                          {election.status}
                        </Badge>
                      </CardTitle>
                      {election.description && (
                        <p className="text-muted-foreground mb-3">{election.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Eligible: {election.eligible_voters || 'All Courses'}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Starts: {formatDate(election.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Ends: {formatDate(election.end_date)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      onClick={() => handleViewCandidates(election)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Candidates
                    </Button>
                    
                    {election.status === 'Active' && canVote && (
                      <Button 
                        onClick={() => handleStartVoting(election)} 
                        className="flex items-center gap-2"
                      >
                        <Vote className="h-4 w-4" />
                        Cast Vote
                      </Button>
                    )}
                    
                    {election.status === 'Upcoming' && (
                      <Button variant="outline" disabled>
                        Election not yet started
                      </Button>
                    )}
                    
                    {election.status === 'Completed' && canViewResults(election.status, election.show_results_to_voters) && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const searchParams = new URLSearchParams(window.location.search);
                          searchParams.set('tab', 'results');
                          searchParams.set('election', election.id);
                          window.history.pushState({}, '', `${window.location.pathname}?${searchParams}`);
                          window.location.reload();
                        }}
                        className="flex items-center gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        View Results
                      </Button>
                    )}
                    
                    {/* Staff can request to publish results for active elections */}
                    {isStaff && election.status === 'Active' && (
                      <Button 
                        variant="outline" 
                        onClick={() => publishResultsRequest(election.id)} 
                        className="flex items-center gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Request to Publish Results
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              loading={loading}
            />
          )}
        </>
      )}

      {/* Candidates Dialog */}
      <Dialog open={showCandidatesDialog} onOpenChange={setShowCandidatesDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Candidates for {selectedElection?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {electionCandidates.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No candidates found for this election</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {electionCandidates.map(candidate => (
                  <CandidateCard 
                    key={candidate.id} 
                    candidate={candidate}
                    showElectionInfo={false}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Voting Dialog */}
      <Dialog open={showVotingDialog} onOpenChange={setShowVotingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
          </DialogHeader>
          {selectedElection && <VotingInterface election={selectedElection as any} onVoteComplete={handleVoteComplete} />}
        </DialogContent>
      </Dialog>
    </div>;
};