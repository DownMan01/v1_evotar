import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePermissions } from '@/hooks/usePermissions';
import { usePendingActions } from '@/hooks/usePendingActions';
import { supabase } from '@/integrations/supabase/client';
import { CreateElectionForm } from '@/components/CreateElectionForm';
import { AddCandidateForm } from '@/components/AddCandidateForm';
import { PendingActionsPanel } from '@/components/PendingActionsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Vote, FileText, TrendingUp, Download, Eye, Plus, Calendar, UserPlus, BarChart3, RefreshCw, Settings } from 'lucide-react';
interface VoterStats {
  total_voters: number;
  approved_voters: number;
  pending_voters: number;
  rejected_voters: number;
}
interface ElectionStats {
  id: string;
  title: string;
  status: string;
  total_voters: number;
  votes_cast: number;
  turnout_percentage: number;
}
interface VoterActivity {
  id: string;
  full_name: string | null;
  student_id: string | null;
  registration_status: string;
  has_voted_in_active: boolean;
}
export const StaffPanel = () => {
  const [voterStats, setVoterStats] = useState<VoterStats>({
    total_voters: 0,
    approved_voters: 0,
    pending_voters: 0,
    rejected_voters: 0
  });
  const [electionStats, setElectionStats] = useState<ElectionStats[]>([]);
  const [voterActivity, setVoterActivity] = useState<VoterActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [electionStatsLoading, setElectionStatsLoading] = useState(true);
  const [voterActivityLoading, setVoterActivityLoading] = useState(true);
  const {
    canViewVoterActivity,
    canApproveVoters,
    canGenerateReports
  } = usePermissions();
  const abortControllerRef = useRef<AbortController | null>(null);
  const {
    publishResultsRequest
  } = usePendingActions();
  useEffect(() => {
    if (canViewVoterActivity) {
      fetchVoterStats();
      fetchElectionStats();
      fetchVoterActivity();
    }
  }, [canViewVoterActivity]);
  const fetchVoterStats = async () => {
    setStatsLoading(true);
    
    try {
      // Get all voter profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('registration_status, role')
        .eq('role', 'Voter');
      
      if (error) throw error;

      const stats = (data || []).reduce((acc, voter) => {
        acc.total_voters++;
        
        if (voter.registration_status === 'Approved') acc.approved_voters++;
        else if (voter.registration_status === 'Pending') acc.pending_voters++;
        else if (voter.registration_status === 'Rejected') acc.rejected_voters++;
        
        return acc;
      }, {
        total_voters: 0,
        approved_voters: 0,
        pending_voters: 0,
        rejected_voters: 0
      });
      
      setVoterStats(stats);
    } catch (error) {
      console.error('Failed to fetch voter stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };
  const fetchElectionStats = async () => {
    setElectionStatsLoading(true);
    
    try {
      const { data: elections, error } = await supabase
        .from('elections')
        .select('*')
        .order('start_date', { ascending: false });
        
      if (error) throw error;
      
      const statsPromises = (elections || []).map(async election => {
        // Get total eligible voters for this specific election
        let totalVoters = 0;
        if (election.eligible_voters === 'All Courses') {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'Voter')
            .eq('registration_status', 'Approved');
          totalVoters = count || 0;
        } else {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'Voter')
            .eq('registration_status', 'Approved')
            .eq('course', election.eligible_voters);
          totalVoters = count || 0;
        }

        // Get actual votes cast for this election from votes
        const { count: votesCast } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('election_id', election.id);

        // Get unique voters who participated
        const { data: uniqueVoters } = await supabase
          .from('voting_sessions')
          .select('voter_id')
          .eq('election_id', election.id)
          .eq('has_voted', true);

        const uniqueVoterCount = uniqueVoters?.length || 0;
        const turnout = totalVoters ? Math.round((uniqueVoterCount / totalVoters) * 100) : 0;
        
        return {
          id: election.id,
          title: election.title,
          status: election.status,
          total_voters: totalVoters,
          votes_cast: votesCast || 0,
          turnout_percentage: turnout
        };
      });
      
      const stats = await Promise.all(statsPromises);
      setElectionStats(stats);
    } catch (error) {
      console.error('Failed to fetch election stats:', error);
    } finally {
      setElectionStatsLoading(false);
    }
  };
  const fetchVoterActivity = async () => {
    setVoterActivityLoading(true);
    
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('role', 'Voter').order('created_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;

      // For each voter, check if they voted in any active election
      const activityPromises = (data || []).map(async voter => {
        const {
          data: sessions
        } = await supabase.from('voting_sessions').select('has_voted, elections!inner(status)').eq('voter_id', voter.user_id);
        const hasVotedInActive = sessions?.some(session => session.has_voted && (session as any).elections.status === 'Active') || false;
        return {
          id: voter.id,
          full_name: voter.full_name,
          student_id: voter.student_id,
          registration_status: voter.registration_status,
          has_voted_in_active: hasVotedInActive
        };
      });
      const activity = await Promise.all(activityPromises);
      setVoterActivity(activity);
    } catch (error) {
      console.error('Failed to fetch voter activity:', error);
    } finally {
      setVoterActivityLoading(false);
    }
  };
  const approveVoter = async (userId: string) => {
    if (!canApproveVoters) return;
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        registration_status: 'Approved'
      }).eq('user_id', userId);
      if (error) throw error;
      await fetchVoterStats();
      await fetchVoterActivity();
    } catch (error) {
      console.error('Failed to approve voter:', error);
    } finally {
      setLoading(false);
    }
  };
  const exportVoterList = async () => {
    if (!canGenerateReports) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('full_name, student_id, email, registration_status, created_at').eq('role', 'Voter').eq('registration_status', 'Approved');
      if (error) throw error;

      // Create CSV content
      const headers = ['Full Name', 'Student ID', 'Email', 'Status', 'Registered Date'];
      const csvContent = [headers.join(','), ...(data || []).map(voter => [voter.full_name || '', voter.student_id || '', voter.email || '', voter.registration_status, new Date(voter.created_at).toLocaleDateString()].join(','))].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], {
        type: 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voter-list-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export voter list:', error);
    }
  };
  const handlePublishResults = async (electionId: string) => {
    await publishResultsRequest(electionId);
  };
  if (!canViewVoterActivity) {
    return <Card>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">You don't have permission to access this panel.</p>
        </CardContent>
      </Card>;
  }
  const refetchAll = () => {
    fetchVoterStats();
    fetchElectionStats();
    fetchVoterActivity();
  };

  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Staff Panel</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={statsLoading || electionStatsLoading || voterActivityLoading}
          >
            <RefreshCw className={`h-4 w-4 ${(statsLoading || electionStatsLoading || voterActivityLoading) ? 'animate-spin' : ''}`} />
          </Button>
          {canGenerateReports && <Button onClick={exportVoterList} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Voter List
            </Button>}
        </div>
      </div>

      {/* Voter Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Voters</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <div className="text-2xl font-bold">{voterStats.total_voters}</div>
            )}
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved Voters</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{voterStats.approved_voters}</div>
            )}
            <p className="text-xs text-muted-foreground">Eligible to vote</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{voterStats.pending_voters}</div>
            )}
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{voterStats.rejected_voters}</div>
            )}
            <p className="text-xs text-muted-foreground">Not eligible</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CreateElectionForm />
            <AddCandidateForm />
            <Button 
              onClick={refetchAll}
              variant="outline" 
              className="w-full flex items-center gap-2"
              disabled={statsLoading || electionStatsLoading || voterActivityLoading}
            >
              <RefreshCw className={`h-4 w-4 ${(statsLoading || electionStatsLoading || voterActivityLoading) ? 'animate-spin' : ''}`} />
              Refresh All Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Staff Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canGenerateReports && (
              <Button 
                onClick={exportVoterList} 
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Voter List
              </Button>
            )}
            <Button 
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={() => window.location.href = '#elections'}
            >
              <Vote className="h-4 w-4" />
              Manage Elections
            </Button>
            <Button 
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={() => window.location.href = '#candidates'}
            >
              <Users className="h-4 w-4" />
              Manage Candidates
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions Panel */}
      <PendingActionsPanel />

      {/* Election Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Election Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {electionStatsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : (
              <>
                {electionStats.map(election => <div key={election.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                     <div>
                        <h4 className="font-medium">{election.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {election.votes_cast} votes • {Math.round((election.votes_cast / election.total_voters) * 100) || 0}% turnout
                        </p>
                      </div>
                      <Badge className={`${election.status === 'Active' ? 'bg-green-500' : election.status === 'Upcoming' ? 'bg-blue-500' : 'bg-gray-500'} text-white`}>
                        {election.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={election.turnout_percentage} className="flex-1" />
                      <span className="text-sm font-medium">{election.turnout_percentage}%</span>
                    </div>
                  </div>)}
                
                {electionStats.length === 0 && <div className="text-center py-8">
                    <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No elections found</p>
                  </div>}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Voter Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Voter Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {voterActivityLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {voterActivity.map(voter => <div key={voter.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{voter.full_name || 'No Name'}</h4>
                      <p className="text-sm text-muted-foreground">ID: {voter.student_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${voter.registration_status === 'Approved' ? 'bg-green-500' : voter.registration_status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'} text-white text-xs`}>
                        {voter.registration_status}
                      </Badge>
                      {voter.has_voted_in_active && <Badge className="bg-blue-500 text-white text-xs">
                          <Vote className="h-3 w-3 mr-1" />
                          Voted
                        </Badge>}
                    </div>
                  </div>)}
                
                {voterActivity.length === 0 && <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No voter activity found</p>
                  </div>}
              </>
            )}
          </div>
        </CardContent>
      </Card>

    </div>;
};