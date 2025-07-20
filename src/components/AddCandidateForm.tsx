import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, UserPlus, Upload, User, GraduationCap, MessageSquare, FileText, Camera, UsersIcon, Users } from 'lucide-react';

interface Election {
  id: string;
  title: string;
}

interface Position {
  id: string;
  title: string;
  election_id: string;
}

export const AddCandidateForm = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [whyVoteMe, setWhyVoteMe] = useState('');
  const [partylist, setPartylist] = useState('');
  const [jhsSchool, setJhsSchool] = useState('');
  const [jhsGraduationYear, setJhsGraduationYear] = useState('');
  const [shsSchool, setShsSchool] = useState('');
  const [shsGraduationYear, setShsGraduationYear] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { isStaff, isAdmin } = usePermissions();

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchPositions(selectedElection);
    } else {
      setPositions([]);
      setSelectedPosition('');
    }
  }, [selectedElection]);

  const fetchElections = async () => {
    const { data, error } = await supabase
      .from('elections')
      .select('id, title')
      .in('status', ['Upcoming', 'Active'])
      .order('start_date', { ascending: true });

    if (error) {
      // Error fetching elections
    } else {
      setElections(data || []);
    }
  };

  const fetchPositions = async (electionId: string) => {
    const { data, error } = await supabase
      .from('positions')
      .select('id, title, election_id')
      .eq('election_id', electionId)
      .order('title');

    if (error) {
      // Error fetching positions
    } else {
      setPositions(data || []);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('candidate-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('candidate-profiles')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setProfileImage(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = '';
      
      // Upload image if provided
      if (profileImage) {
        const uploadedUrl = await handleImageUpload(profileImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const candidateData = {
        election_id: selectedElection,
        position_id: selectedPosition,
        full_name: fullName,
        bio: bio || null,
        image_url: imageUrl || null,
        why_vote_me: whyVoteMe || null,
        partylist: partylist || null,
        jhs_school: jhsSchool || null,
        jhs_graduation_year: jhsGraduationYear ? parseInt(jhsGraduationYear) : null,
        shs_school: shsSchool || null,
        shs_graduation_year: shsGraduationYear ? parseInt(shsGraduationYear) : null
      };

      // Both staff and admins can add candidates directly (no approval needed)
      const { error } = await supabase
        .from('candidates')
        .insert(candidateData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Candidate added successfully",
      });

      // Reset form
      setSelectedElection('');
      setSelectedPosition('');
      setFullName('');
      setBio('');
      setWhyVoteMe('');
      setPartylist('');
      setJhsSchool('');
      setJhsGraduationYear('');
      setShsSchool('');
      setShsGraduationYear('');
      setProfileImage(null);
      setImagePreview('');
      setShowDialog(false);
    } catch (error: any) {
      console.error('Candidate addition error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add candidate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isStaff && !isAdmin) {
    return null;
  }

  return (
    <div>
      <Button onClick={() => setShowDialog(true)} className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        Add Candidate
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Add New Candidate
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Upload Section */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="h-5 w-5 text-primary" />
                  Profile Picture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage src={imagePreview} alt="Preview" />
                      <AvatarFallback className="text-lg bg-gradient-to-br from-primary/10 to-primary/20">
                        {fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase() : <User className="h-8 w-8" />}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <Label htmlFor="profileImage" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20 transition-colors">
                        <Upload className="h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload Photo"}
                      </div>
                    </Label>
                    <Input
                      id="profileImage"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      JPG, PNG or GIF (max 5MB)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="election" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Election
                  </Label>
                  <Select value={selectedElection} onValueChange={setSelectedElection} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select an election" />
                    </SelectTrigger>
                    <SelectContent>
                      {elections.map((election) => (
                        <SelectItem key={election.id} value={election.id}>
                          {election.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="position" className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4" />
                    Position
                  </Label>
                  <Select 
                    value={selectedPosition} 
                    onValueChange={setSelectedPosition} 
                    disabled={!selectedElection}
                    required
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter candidate's full name"
                    className="mt-1"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Educational Background */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Educational Background
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jhsSchool">Junior High School</Label>
                  <Input
                    id="jhsSchool"
                    value={jhsSchool}
                    onChange={(e) => setJhsSchool(e.target.value)}
                    placeholder="School name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="jhsGraduationYear">JHS Graduation Year</Label>
                  <Input
                    id="jhsGraduationYear"
                    type="number"
                    value={jhsGraduationYear}
                    onChange={(e) => setJhsGraduationYear(e.target.value)}
                    placeholder="2020"
                    min="1900"
                    max={new Date().getFullYear() + 10}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="shsSchool">Senior High School</Label>
                  <Input
                    id="shsSchool"
                    value={shsSchool}
                    onChange={(e) => setShsSchool(e.target.value)}
                    placeholder="School name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="shsGraduationYear">SHS Graduation Year</Label>
                  <Input
                    id="shsGraduationYear"
                    type="number"
                    value={shsGraduationYear}
                    onChange={(e) => setShsGraduationYear(e.target.value)}
                    placeholder="2023"
                    min="1900"
                    max={new Date().getFullYear() + 10}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Campaign Information */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Campaign Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="partylist" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Partylist (Optional)
                  </Label>
                  <Input
                    id="partylist"
                    value={partylist}
                    onChange={(e) => setPartylist(e.target.value)}
                    placeholder="Enter partylist affiliation (if any)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Biography</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about your background, achievements, and qualifications..."
                    rows={4}
                    className="mt-1 resize-none"
                  />
                </div>
                <div>
                  <Label htmlFor="whyVoteMe">Why should people vote for you?</Label>
                  <Textarea
                    id="whyVoteMe"
                    value={whyVoteMe}
                    onChange={(e) => setWhyVoteMe(e.target.value)}
                    placeholder="Share your vision, goals, and what makes you the best candidate for this position..."
                    rows={4}
                    className="mt-1 resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowDialog(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || uploading || !selectedElection || !selectedPosition || !fullName.trim()}
                className="px-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    {uploading ? 'Uploading...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Candidate
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};