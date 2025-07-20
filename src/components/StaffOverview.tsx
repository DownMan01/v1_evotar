import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, Plus, Users, BarChart3, Clock, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CreateElectionForm } from '@/components/CreateElectionForm';
import { AddCandidateForm } from '@/components/AddCandidateForm';

interface StaffStats {
  totalElections: number;
  activeElections: number;
  totalCandidates: number;
  pendingActions: number;
  totalVotes: number;
}

export const StaffOverview = () => {
  const [stats, setStats] = useState<StaffStats>({
    totalElections: 0,
    activeElections: 0,
    totalCandidates: 0,
    pendingActions: 0,
    totalVotes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffStats();
  }, []);

  const fetchStaffStats = async () => {
    try {
      setLoading(true);

      // Get total elections
      const { count: totalElections } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true });

      // Get active elections
      const { count: activeElections } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

      // Get total candidates
      const { count: totalCandidates } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });

      // Get pending actions
      const { count: pendingActions } = await supabase
        .from('pending_actions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      // Get total votes
      const { count: totalVotes } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalElections: totalElections || 0,
        activeElections: activeElections || 0,
        totalCandidates: totalCandidates || 0,
        pendingActions: pendingActions || 0,
        totalVotes: totalVotes || 0
      });
    } catch (error) {
      console.error('Error fetching staff stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
        <CardContent className="p-6 md:p-8 lg:p-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 space-y-4 md:space-y-6">
              <div className="space-y-3 md:space-y-4">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                  Staff Dashboard
                </h2>
                <p className="text-muted-foreground text-base md:text-lg lg:text-xl leading-relaxed max-w-2xl">
                  Comprehensive tools to manage elections efficiently and transparently with advanced oversight capabilities.
                </p>
              </div>
              
              {/* Management Actions */}
              <div className="flex flex-wrap gap-3">
                <CreateElectionForm />
                <AddCandidateForm />
                <Button 
                  variant="outline"
                  size="lg"
                  className="px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Settings className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Manage Settings
                </Button>
              </div>
            </div>
            
            {/* Modern Illustration - Hidden on mobile */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative">
                <div className="w-80 h-64 bg-gradient-to-br from-primary/10 via-primary/20 to-primary/10 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-primary/20">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl">
                      <Vote className="w-12 h-12 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-primary">STAFF</div>
                    <div className="text-sm text-muted-foreground mt-2">Election Management</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Vote className="h-4 w-4 text-blue-600" />
              Elections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{loading ? '...' : stats.totalElections}</div>
            <p className="text-xs text-muted-foreground">Total created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-600" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loading ? '...' : stats.activeElections}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{loading ? '...' : stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{loading ? '...' : stats.pendingActions}</div>
            <Badge variant={stats.pendingActions > 0 ? "destructive" : "secondary"} className="text-xs mt-1">
              {stats.pendingActions > 0 ? "Needs Review" : "All Clear"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              Votes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{loading ? '...' : stats.totalVotes}</div>
            <p className="text-xs text-muted-foreground">Total cast</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Card */}
      <Card className="border border-border/50 shadow-lg">
        <CardContent className="text-center py-8 md:py-12 lg:py-16 px-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full mx-auto mb-4 md:mb-6 flex items-center justify-center">
            <Vote className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-2 md:mb-3">
            {stats.pendingActions > 0 
              ? `${stats.pendingActions} action${stats.pendingActions > 1 ? 's' : ''} need${stats.pendingActions === 1 ? 's' : ''} review`
              : 'All systems ready'
            }
          </h3>
          <p className="text-muted-foreground text-base md:text-lg">
            {stats.pendingActions > 0 
              ? 'Check the Admin Panel for pending approvals'
              : 'All tools are available for election management'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};