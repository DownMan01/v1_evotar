import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { ResultsSkeleton } from '@/components/LoadingSkeleton';
import { Trophy, TrendingUp, Users, Search, RefreshCw } from 'lucide-react';

interface ElectionResult {
  election_id: string;
  election_title: string;
  election_status: string;
  eligible_voters: string;
  show_results_to_voters: boolean;
  position_id: string;
  position_title: string;
  candidate_id: string;
  candidate_name: string;
  vote_count: number;
  total_votes_in_position: number;
  total_eligible_voters_count: number;
  percentage: number;
}

interface GroupedResults {
  [electionId: string]: {
    election_title: string;
    eligible_voters: string;
    show_results_to_voters: boolean;
    positions: {
      [positionId: string]: {
        position_title: string;
        candidates: ElectionResult[];
        total_votes: number;
        total_eligible_voters: number;
      };
    };
  };
}

export const Results = () => {
  const [results, setResults] = useState<GroupedResults>({});
  const [filteredResults, setFilteredResults] = useState<GroupedResults>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const { isStaff, isAdmin } = usePermissions();

  // Memoize the permission check to prevent unnecessary re-renders
  const canViewResults = useMemo(() => {
    return (electionStatus: string, showResultsToVoters: boolean) => {
      if (isAdmin || isStaff) return true; // Admin and staff can always view results
      return electionStatus === 'Completed' && showResultsToVoters; // Voters only if explicitly allowed
    };
  }, [isAdmin, isStaff]);

  // Memoize fetchResults to prevent infinite re-renders
  const fetchResults = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);

      // Use the optimized database function - single query instead of 2N queries
      const { data: allResultsData, error: resultsError } = await supabase.rpc('get_all_election_results_optimized');

      if (resultsError) {
        console.error('Supabase error fetching results:', resultsError);
        throw resultsError;
      }

      // Early return if no data - show "no results" immediately
      if (!allResultsData || allResultsData.length === 0) {
        setResults({});
        setFilteredResults({});
        return;
      }

      // Filter results based on permissions
      const visibleResults = allResultsData.filter(result => 
        canViewResults(result.election_status, result.show_results_to_voters)
      );

      // Early return if no visible results - show "no results" immediately
      if (visibleResults.length === 0) {
        setResults({});
        setFilteredResults({});
        return;
      }

      // Group results by election and position
      const grouped: GroupedResults = {};

      visibleResults.forEach(result => {
        // Initialize election if not exists
        if (!grouped[result.election_id]) {
          grouped[result.election_id] = {
            election_title: result.election_title,
            eligible_voters: result.eligible_voters,
            show_results_to_voters: result.show_results_to_voters,
            positions: {}
          };
        }

        // Initialize position if not exists
        if (!grouped[result.election_id].positions[result.position_id]) {
          grouped[result.election_id].positions[result.position_id] = {
            position_title: result.position_title,
            candidates: [],
            total_votes: 0,
            total_eligible_voters: Number(result.total_eligible_voters_count)
          };
        }

        // Create candidate result object
        const candidateResult: ElectionResult = {
          election_id: result.election_id,
          election_title: result.election_title,
          election_status: result.election_status,
          eligible_voters: result.eligible_voters,
          show_results_to_voters: result.show_results_to_voters,
          position_id: result.position_id,
          position_title: result.position_title,
          candidate_id: result.candidate_id,
          candidate_name: result.candidate_name,
          vote_count: Number(result.vote_count),
          total_votes_in_position: Number(result.total_votes_in_position),
          total_eligible_voters_count: Number(result.total_eligible_voters_count),
          percentage: Number(result.percentage)
        };

        // Add candidate to position
        grouped[result.election_id].positions[result.position_id].candidates.push(candidateResult);
        
        // Update total votes for position (avoid double counting)
        if (!grouped[result.election_id].positions[result.position_id].total_votes) {
          grouped[result.election_id].positions[result.position_id].total_votes = Number(result.total_votes_in_position);
        }
      });

      // Sort candidates by vote count within each position
      Object.values(grouped).forEach(election => {
        Object.values(election.positions).forEach(position => {
          position.candidates.sort((a, b) => b.vote_count - a.vote_count);
        });
      });

      setResults(grouped);
      setFilteredResults(grouped);
    } catch (error: any) {
      console.error('Error fetching results:', error);
      setError('Failed to load results. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [canViewResults, loading]);

  // Only fetch once on mount, prevent infinite re-renders
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      fetchResults();
    }
  }, [hasInitialized, fetchResults]);

  // Filter results based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredResults(results);
      return;
    }

    const filtered: GroupedResults = {};
    const lowerSearch = searchTerm.toLowerCase();
    
    Object.entries(results).forEach(([electionId, election]) => {
      const electionMatches = election.election_title.toLowerCase().includes(lowerSearch);
      
      const filteredPositions: typeof election.positions = {};
      Object.entries(election.positions).forEach(([positionId, position]) => {
        const positionMatches = position.position_title.toLowerCase().includes(lowerSearch);
        const candidateMatches = position.candidates.some(candidate =>
          candidate.candidate_name.toLowerCase().includes(lowerSearch)
        );
        
        if (electionMatches || positionMatches || candidateMatches) {
          filteredPositions[positionId] = position;
        }
      });
      
      if (Object.keys(filteredPositions).length > 0) {
        filtered[electionId] = {
          ...election,
          positions: filteredPositions
        };
      }
    });
    
    setFilteredResults(filtered);
  }, [results, searchTerm]);

  if (loading) {
    return <ResultsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Election Results</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchResults}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          placeholder="Search results by election, position, or candidate name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {error && (
        <div className="text-center py-8">
          <p className="text-destructive mb-2">{error}</p>
          <Button onClick={fetchResults} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {!loading && !error && Object.keys(filteredResults).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              {searchTerm ? 'No results match your search' : 'No results available to view'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Results will be available here once the election is completed.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(filteredResults).map(([electionId, election]) => (
            <Card key={electionId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {election.election_title}
                  <Badge variant="outline" className="ml-auto">
                    Eligible: {election.eligible_voters}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(election.positions).map(([positionId, position]) => (
                  <div key={positionId} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{position.position_title}</h3>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {position.total_votes} votes cast
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {position.candidates.map((candidate, index) => {
                        const isWinner = index === 0 && candidate.vote_count > 0;
                        
                        return (
                          <div 
                            key={candidate.candidate_id} 
                            className={`p-4 rounded-lg border ${
                              isWinner 
                                ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' 
                                : 'border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {isWinner && <Trophy className="h-4 w-4 text-yellow-600" />}
                                <span className="font-medium">{candidate.candidate_name}</span>
                                {isWinner && <Badge className="bg-yellow-600 text-white">Winner</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {candidate.vote_count} votes ({candidate.percentage}%)
                              </div>
                            </div>
                            <Progress value={candidate.percentage} className="h-2" />
                            <div className="text-xs text-muted-foreground mt-2">
                              Based on {position.total_eligible_voters} total eligible voters in {election.eligible_voters}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};