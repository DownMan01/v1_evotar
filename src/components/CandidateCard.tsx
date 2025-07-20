import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState } from 'react';
import { Eye, Award } from 'lucide-react';

interface Candidate {
  id: string;
  full_name: string;
  bio: string | null;
  image_url: string | null;
  position_title: string;
  election_title: string;
  election_status: string;
  why_vote_me?: string | null;
  jhs_school?: string | null;
  jhs_graduation_year?: number | null;
  shs_school?: string | null;
  shs_graduation_year?: number | null;
  partylist?: string | null;
}

interface CandidateCardProps {
  candidate: Candidate;
  showElectionInfo?: boolean;
}

export const CandidateCard = ({ candidate, showElectionInfo = true }: CandidateCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
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

  return (
    <>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-background to-muted/20">
        <div className="relative">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50" />
          
          <CardHeader className="relative text-center pb-4 pt-6">
            <div className="relative mx-auto mb-4">
              <Avatar className="h-24 w-24 mx-auto ring-4 ring-background shadow-lg">
                <AvatarImage 
                  src={candidate.image_url || undefined} 
                  alt={candidate.full_name}
                  className="object-cover"
                />
                <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {getInitials(candidate.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2">
                <Award className="h-4 w-4" />
              </div>
            </div>
            
            <h3 className="font-bold text-lg text-foreground transition-colors">
              {candidate.full_name}
            </h3>
            
            <div className="space-y-2">
            <Badge variant="secondary" className="text-sm font-medium">
                Running for {candidate.position_title}
              </Badge>
              
              {showElectionInfo && (
                <div className="flex justify-center">
                  <Badge 
                    className={`${getStatusColor(candidate.election_status)} text-white text-xs px-3 py-1`}
                  >
                    {candidate.election_title}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="relative pt-2 pb-6">
            {candidate.bio ? (
              <p className="text-sm text-muted-foreground text-center line-clamp-3 mb-4 leading-relaxed">
                {candidate.bio}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center italic mb-4">
                No biography available
              </p>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDetails(true)}
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </CardContent>
        </div>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarImage 
                  src={candidate.image_url || undefined} 
                  alt={candidate.full_name}
                  className="object-cover"
                />
                <AvatarFallback className="text-lg font-semibold">
                  {getInitials(candidate.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">{candidate.full_name}</DialogTitle>
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-sm">
                    Running for {candidate.position_title}
                  </Badge>
                  {showElectionInfo && (
                    <div>
                      <Badge className={`${getStatusColor(candidate.election_status)} text-white`}>
                        {candidate.election_title}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold mb-3 text-foreground">Biography</h4>
              {candidate.bio ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {candidate.bio}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  No detailed biography available for this candidate.
                </p>
              )}
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3 text-foreground">Why Vote for Me?</h4>
              {candidate.why_vote_me?.trim() ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {candidate.why_vote_me}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  No explanation provided by the candidate.
                </p>
              )}
            </div>

            {/* Campaign Information */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-3 text-foreground">Campaign Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Position */}
                <div>
                  <span className="font-medium text-foreground">Running for:</span>
                  <p className="text-muted-foreground">
                    {candidate.position_title?.trim() || "No position specified"}
                  </p>
                </div>

                {/* Election Title */}
                {showElectionInfo && (
                  <div>
                    <span className="font-medium text-foreground">Election:</span>
                    <p className="text-muted-foreground">
                      {candidate.election_title?.trim() || "No election title available"}
                    </p>
                  </div>
                )}

                {/* Partylist */}
                <div>
                  <span className="font-medium text-foreground">Partylist:</span>
                  <p className="text-muted-foreground">
                    {candidate.partylist?.trim() || "Independent"}
                  </p>
                </div>

                {/* Election Status */}
                <div>
                  <span className="font-medium text-foreground">Election Status:</span>
                  <Badge className={`${getStatusColor(candidate.election_status)} text-white ml-2 text-xs`}>
                    {candidate.election_status || "Unknown"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Educational Background */}
            {(candidate.jhs_school?.trim() || candidate.shs_school?.trim()) ? (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3 text-foreground">Educational Background</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Junior High School */}
                  {candidate.jhs_school?.trim() && (
                    <div>
                      <span className="font-medium text-foreground">Junior High School:</span>
                      <p className="text-muted-foreground">{candidate.jhs_school}</p>
                      {candidate.jhs_graduation_year && (
                        <p className="text-muted-foreground text-xs">
                          Graduated: {candidate.jhs_graduation_year}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Senior High School */}
                  {candidate.shs_school?.trim() && (
                    <div>
                      <span className="font-medium text-foreground">Senior High School:</span>
                      <p className="text-muted-foreground">{candidate.shs_school}</p>
                      {candidate.shs_graduation_year && (
                        <p className="text-muted-foreground text-xs">
                          Graduated: {candidate.shs_graduation_year}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3 text-foreground">Educational Background</h4>
                <p className="text-muted-foreground italic text-sm">
                  No educational background provided.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};