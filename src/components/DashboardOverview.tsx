import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, Vote, Calendar, Users, TrendingUp, Plus, Settings } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { CreateElectionForm } from '@/components/CreateElectionForm';
import { AddCandidateForm } from '@/components/AddCandidateForm';

interface QuickStats {
  activeElections: number;
  totalVotes: number;
  userVotedInActive: boolean;
  nextElectionDate?: string;
}

export const DashboardOverview = () => {
  const [stats, setStats] = useState<QuickStats>({ 
    activeElections: 0, 
    totalVotes: 0, 
    userVotedInActive: false 
  });
  const [loading, setLoading] = useState(true);
  const { canVote, isStaff, isAdmin } = usePermissions();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Get active elections count
      const { count: activeElections } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

      // Get total votes count
      const { count: totalVotes } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true });

      // Check if current user has voted in any active election
      let userVotedInActive = false;
      if (canVote) {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const { data: votingSessions } = await supabase
            .from('voting_sessions')
            .select('has_voted, elections!inner(status)')
            .eq('voter_id', user.user.id)
            .eq('has_voted', true);

          userVotedInActive = votingSessions?.some(
            session => (session.elections as any).status === 'Active'
          ) || false;
        }
      }

      // Get next upcoming election
      const { data: upcomingElections } = await supabase
        .from('elections')
        .select('start_date')
        .eq('status', 'Upcoming')
        .order('start_date', { ascending: true })
        .limit(1);

      setStats({
        activeElections: activeElections || 0,
        totalVotes: totalVotes || 0,
        userVotedInActive,
        nextElectionDate: upcomingElections?.[0]?.start_date
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
        <CardContent className="p-12">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-foreground leading-tight">
                  Welcome to your dashboard
                </h2>
                <p className="text-muted-foreground text-xl leading-relaxed max-w-2xl">
                  Evotar ensures your electoral journey is secure, accessible, and transparent. Your voice matters.
                </p>
              </div>
              
              {/* Action Buttons for Staff/Admin */}
              <div className="flex flex-wrap gap-3">
                {(isStaff || isAdmin) && (
                  <>
                    <CreateElectionForm />
                    <AddCandidateForm />
                  </>
                )}
                
                <Button 
                  size="lg"
                  variant="outline"
                  className="px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <CheckSquare className="w-5 h-5 mr-2" />
                  Learn How It Works
                </Button>
              </div>
            </div>
            
            {/* Modern Illustration */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative">
                <div className="w-80 h-64 bg-gradient-to-br from-primary/10 via-primary/20 to-primary/10 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-primary/20">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl">
                      <CheckSquare className="w-12 h-12 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-primary">VOTE</div>
                    <div className="text-sm text-muted-foreground mt-2">Secure & Transparent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Active Elections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.activeElections}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Votes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalVotes}</div>
            <p className="text-xs text-muted-foreground">Cast across all elections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Your Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {canVote ? (
                <Badge variant={stats.userVotedInActive ? "default" : "secondary"}>
                  {stats.userVotedInActive ? "Voted" : "Can Vote"}
                </Badge>
              ) : (
                <Badge variant="outline">
                  {isStaff ? "Staff" : isAdmin ? "Admin" : "Observer"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current participation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Next Election
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {stats.nextElectionDate ? (
                <span className="font-medium">
                  {formatDate(stats.nextElectionDate)}
                </span>
              ) : (
                <span className="text-muted-foreground">None scheduled</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming events</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Card */}
      <Card className="border border-border/50 shadow-lg">
        <CardContent className="text-center py-16">
          <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto mb-6 flex items-center justify-center">
            {stats.activeElections > 0 ? (
              <Vote className="w-10 h-10 text-primary" />
            ) : (
              <CheckSquare className="w-10 h-10 text-primary" />
            )}
          </div>
          <h3 className="text-2xl font-semibold text-foreground mb-3">
            {stats.activeElections > 0 
              ? `${stats.activeElections} active election${stats.activeElections > 1 ? 's' : ''}`
              : 'No active elections'
            }
          </h3>
          <p className="text-muted-foreground text-lg">
            {stats.activeElections > 0 
              ? 'Make your voice heard by participating in voting'
              : 'Check back later for upcoming elections'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};