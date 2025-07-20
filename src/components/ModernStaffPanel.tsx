import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { PendingActionsPanel } from '@/components/PendingActionsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Vote, TrendingUp, Download, RefreshCw, CheckCircle, Clock, XCircle, BarChart3, Activity } from 'lucide-react';
interface VoterStats {
  total_voters: number;
  pending_actions: number;
  active_elections: number;
  total_votes_cast: number;
}
interface ElectionStats {
  id: string;
  title: string;
  status: string;
  total_voters: number;
  votes_cast: number;
  unique_voters: number;
  turnout_percentage: number;
  eligible_voters: string;
}
interface VoterActivity {
  id: string;
  full_name: string | null;
  student_id: string | null;
  registration_status: string;
  has_voted_in_active: boolean;
  course: string | null;
  election_title?: string;
  election_status?: string;
  voted_at?: string;
}
export const ModernStaffPanel = () => {
  const [voterStats, setVoterStats] = useState<VoterStats>({
    total_voters: 0,
    pending_actions: 0,
    active_elections: 0,
    total_votes_cast: 0
  });
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
  const [electionStats, setElectionStats] = useState<ElectionStats[]>([]);
  const [voterActivity, setVoterActivity] = useState<VoterActivity[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [electionStatsLoading, setElectionStatsLoading] = useState(true);
  const [voterActivityLoading, setVoterActivityLoading] = useState(true);
  const {
    canViewVoterActivity,
    canGenerateReports
  } = usePermissions();
  useEffect(() => {
    if (canViewVoterActivity) {
      fetchVoterStats();
      fetchPendingActionsCount();
      fetchElectionStats();
      fetchVoterActivity();
    }
  }, [canViewVoterActivity]);
  const fetchVoterStats = async () => {
    setStatsLoading(true);
    try {
      // Add timeout and abort controller for better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      // Get total voters count
      const {
        count: totalVoters,
        error: votersError
      } = await supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      }).eq('role', 'Voter');
      
      if (votersError) {
        console.error('Error fetching voters count:', votersError);
        throw votersError;
      }

      // Get total pending actions count
      const {
        count: pendingActions,
        error: pendingError
      } = await supabase.from('pending_actions').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'Pending');
      
      if (pendingError) {
        console.error('Error fetching pending actions count:', pendingError);
        throw pendingError;
      }

      // Get active elections count
      const {
        count: activeElections,
        error: electionsError
      } = await supabase.from('elections').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'Active');
      
      if (electionsError) {
        console.error('Error fetching active elections count:', electionsError);
        throw electionsError;
      }

      // Get total votes cast
      const {
        count: totalVotes,
        error: votesError
      } = await supabase.from('votes').select('*', {
        count: 'exact',
        head: true
      });
      
      if (votesError) {
        console.error('Error fetching total votes count:', votesError);
        throw votesError;
      }

      clearTimeout(timeoutId);
      setVoterStats({
        total_voters: totalVoters || 0,
        pending_actions: pendingActions || 0,
        active_elections: activeElections || 0,
        total_votes_cast: totalVotes || 0
      });
    } catch (error: any) {
      console.error('Failed to fetch voter stats:', error);
      
      if (error.name === 'AbortError') {
        console.error('Voter stats request timeout');
      } else if (error.message?.includes('Failed to fetch')) {
        console.error('Network connection error for voter stats');
      }
    } finally {
      setStatsLoading(false);
    }
  };
  const fetchElectionStats = async () => {
    setElectionStatsLoading(true);
    try {
      const {
        data: elections,
        error
      } = await supabase.from('elections').select('*').order('start_date', {
        ascending: false
      }).limit(5);
      if (error) throw error;
      const statsPromises = (elections || []).map(async election => {
        // Get total eligible voters for this specific election
        let totalVoters = 0;
        if (election.eligible_voters === 'All Courses') {
          const {
            count
          } = await supabase.from('profiles').select('*', {
            count: 'exact',
            head: true
          }).eq('role', 'Voter').eq('registration_status', 'Approved');
          totalVoters = count || 0;
        } else {
          const {
            count
          } = await supabase.from('profiles').select('*', {
            count: 'exact',
            head: true
          }).eq('role', 'Voter').eq('registration_status', 'Approved').eq('course', election.eligible_voters);
          totalVoters = count || 0;
        }

        // Get actual votes cast for this election
        const {
          count: votesCast
        } = await supabase.from('votes').select('*', {
          count: 'exact',
          head: true
        }).eq('election_id', election.id);

        // Get unique voters who participated
        const {
          data: uniqueVoters
        } = await supabase.from('voting_sessions').select('voter_id').eq('election_id', election.id).eq('has_voted', true);
        const uniqueVoterCount = uniqueVoters?.length || 0;
        const turnout = totalVoters ? Math.round(uniqueVoterCount / totalVoters * 100) : 0;
        return {
          id: election.id,
          title: election.title,
          status: election.status,
          total_voters: totalVoters,
          votes_cast: votesCast || 0,
          unique_voters: uniqueVoterCount,
          turnout_percentage: turnout,
          eligible_voters: election.eligible_voters
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
      // Get latest votes with voter and election info
      const {
        data: recentVotes,
        error
      } = await supabase.from('votes').select(`
          id,
          created_at,
          voter_id,
          elections!inner(
            title,
            status
          )
        `).order('created_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;

      // Get voter profiles separately
      const voterIds = recentVotes?.map(vote => vote.voter_id) || [];
      const {
        data: profiles
      } = await supabase.from('profiles').select('user_id, full_name, student_id, course, registration_status').in('user_id', voterIds);
      const activity = (recentVotes || []).map(vote => {
        const profile = profiles?.find(p => p.user_id === vote.voter_id);
        return {
          id: vote.id,
          full_name: profile?.full_name || null,
          student_id: profile?.student_id || null,
          registration_status: profile?.registration_status || 'Unknown',
          course: profile?.course || null,
          election_title: (vote.elections as any).title,
          election_status: (vote.elections as any).status,
          voted_at: vote.created_at,
          has_voted_in_active: (vote.elections as any).status === 'Active'
        };
      });
      setVoterActivity(activity);
    } catch (error) {
      console.error('Failed to fetch voter activity:', error);
    } finally {
      setVoterActivityLoading(false);
    }
  };
  const fetchPendingActionsCount = async () => {
    setPendingLoading(true);
    try {
      const {
        count,
        error
      } = await supabase.from('pending_actions').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'Pending');
      if (error) throw error;
      setPendingActionsCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch pending actions count:', error);
    } finally {
      setPendingLoading(false);
    }
  };
  const exportVoterList = async () => {
    if (!canGenerateReports) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('full_name, student_id, email, registration_status, course, created_at').eq('role', 'Voter').eq('registration_status', 'Approved');
      if (error) throw error;
      const headers = ['Full Name', 'Student ID', 'Email', 'Course', 'Status', 'Registered Date'];
      const csvContent = [headers.join(','), ...(data || []).map(voter => [voter.full_name || '', voter.student_id || '', voter.email || '', voter.course || '', voter.registration_status, new Date(voter.created_at).toLocaleDateString()].join(','))].join('\n');
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
  const refetchAll = () => {
    fetchVoterStats();
    fetchPendingActionsCount();
    fetchElectionStats();
    fetchVoterActivity();
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };
  const getElectionStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500 text-white';
      case 'Upcoming':
        return 'bg-blue-500 text-white';
      case 'Completed':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };
  if (!canViewVoterActivity) {
    return <Card>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">You don't have permission to access this panel.</p>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Staff Panel</h2>
          <p className="text-muted-foreground text-sm md:text-base">Monitor voting activity and manage elections</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={refetchAll} disabled={statsLoading || pendingLoading || electionStatsLoading || voterActivityLoading} className="flex-1 sm:flex-none">
            <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ${statsLoading || pendingLoading || electionStatsLoading || voterActivityLoading ? 'animate-spin' : ''}`} />
            <span className="ml-1 md:ml-2">Refresh</span>
          </Button>
          {canGenerateReports && <Button onClick={exportVoterList} className="flex items-center gap-1 md:gap-2 flex-1 sm:flex-none text-sm">
              <Download className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Export Data</span>
              <span className="sm:hidden">Export</span>
            </Button>}
        </div>
      </div>

      {/* Modern Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Voters Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Voters</CardTitle>
              <div className="p-2 rounded-full bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {statsLoading ? <Skeleton className="h-10 w-20 mb-2" /> : <div className="text-4xl font-bold text-blue-700 dark:text-blue-300 mb-2">{voterStats.total_voters}</div>}
            <p className="text-sm text-blue-600 dark:text-blue-400">Registered users</p>
            <div className="absolute bottom-0 right-0 opacity-10">
              <Users className="h-16 w-16 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Active Elections Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Active Elections</CardTitle>
              <div className="p-2 rounded-full bg-emerald-500/10">
                <Vote className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {statsLoading ? <Skeleton className="h-10 w-20 mb-2" /> : <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-300 mb-2">{voterStats.active_elections}</div>}
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Currently running</p>
            <div className="absolute bottom-0 right-0 opacity-10">
              <Vote className="h-16 w-16 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-amber-600/10" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending Requests</CardTitle>
              <div className="p-2 rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {statsLoading ? <Skeleton className="h-10 w-20 mb-2" /> : <div className="text-4xl font-bold text-amber-700 dark:text-amber-300 mb-2">{voterStats.pending_actions}</div>}
            <p className="text-sm text-amber-600 dark:text-amber-400">Awaiting review</p>
            <div className="absolute bottom-0 right-0 opacity-10">
              <Clock className="h-16 w-16 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Votes Cast Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Votes</CardTitle>
              <div className="p-2 rounded-full bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {statsLoading ? <Skeleton className="h-10 w-20 mb-2" /> : <div className="text-4xl font-bold text-purple-700 dark:text-purple-300 mb-2">{voterStats.total_votes_cast}</div>}
            <p className="text-sm text-purple-600 dark:text-purple-400">Votes cast overall</p>
            <div className="absolute bottom-0 right-0 opacity-10">
              <BarChart3 className="h-16 w-16 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Pending Actions */}
          <PendingActionsPanel />

          {/* Recent Voter Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Recent Voter Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {voterActivityLoading ? Array.from({
                length: 5
              }).map((_, i) => <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>) : voterActivity.length === 0 ? <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No voter activity found</p>
                  </div> : voterActivity.map(voter => <div key={voter.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{voter.full_name || 'No Name'}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>ID: {voter.student_id}</span>
                            {voter.course && <>
                                <span>•</span>
                                <span>{voter.course}</span>
                              </>}
                          </div>
                          {voter.election_title && voter.voted_at && <div className="text-xs text-muted-foreground mt-1">
                              Voted in "{voter.election_title}" • {new Date(voter.voted_at).toLocaleDateString()}
                            </div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(voter.registration_status)}
                          <Badge variant="outline" className="text-xs">
                            {voter.registration_status}
                          </Badge>
                        </div>
                        {voter.has_voted_in_active && <Badge className="bg-green-500 text-white text-xs">
                            <Vote className="h-3 w-3 mr-1" />
                            Voted
                          </Badge>}
                      </div>
                    </div>)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Election Progress */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle>Election Progress</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  Recent Elections
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {electionStatsLoading ? Array.from({
                length: 3
              }).map((_, i) => <div key={i} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                    </div>) : electionStats.length === 0 ? <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No elections found</p>
                  </div> : electionStats.map(election => <div key={election.id} className="space-y-3 p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg">{election.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{election.votes_cast} total votes</span>
                            <span>{election.unique_voters} voters participated</span>
                            <span>Eligible: {election.eligible_voters}</span>
                          </div>
                        </div>
                        <Badge className={getElectionStatusColor(election.status)}>
                          {election.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Voter Turnout</span>
                          <span className="font-medium">{election.turnout_percentage}%</span>
                        </div>
                        <Progress value={election.turnout_percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {election.unique_voters} out of {election.total_voters} eligible voters
                        </p>
                      </div>
                    </div>)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};