import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, User, Lock, Save } from 'lucide-react';
export const Settings = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    student_id: profile?.student_id || '',
    email: profile?.email || '',
    course: profile?.course || '',
    year_level: profile?.year_level || '',
    gender: profile?.gender || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: profileData.full_name,
        student_id: profileData.student_id,
        email: profileData.email,
        course: profileData.course,
        year_level: profileData.year_level,
        gender: profileData.gender
      }).eq('user_id', user?.id);
      if (error) {
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      if (error) {
        toast({
          title: "Error",
          description: "Failed to update password. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Password updated successfully."
        });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-7 w-7" />
          Settings
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Overview Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Image Display */}
            {profile?.id_image_url && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">ID Image</Label>
                <div className="relative w-full max-w-sm mx-auto">
                  <img 
                    src={profile.id_image_url} 
                    alt="ID Image" 
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Uploaded ID
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                <p className="font-medium">{profile?.full_name || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Student ID</Label>
                <p className="font-medium">{profile?.student_id || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                <p className="capitalize font-medium">{profile?.role}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Registration Status    </Label>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  profile?.registration_status === 'Approved' ? 'bg-green-100 text-green-800' :
                  profile?.registration_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {profile?.registration_status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input 
                    id="full_name" 
                    value={profileData.full_name} 
                    onChange={e => setProfileData(prev => ({
                      ...prev,
                      full_name: e.target.value
                    }))} 
                    placeholder="Enter your full name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student ID</Label>
                  <Input 
                    id="student_id" 
                    value={profileData.student_id} 
                    onChange={e => setProfileData(prev => ({
                      ...prev,
                      student_id: e.target.value
                    }))} 
                    placeholder="Enter your student ID" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profileData.email} 
                  onChange={e => setProfileData(prev => ({
                    ...prev,
                    email: e.target.value
                  }))} 
                  placeholder="Enter your email address" 
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input 
                    id="course" 
                    value={profileData.course} 
                    onChange={e => setProfileData(prev => ({
                      ...prev,
                      course: e.target.value
                    }))} 
                    placeholder="Enter your course" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_level">Year Level</Label>
                  <Input 
                    id="year_level" 
                    value={profileData.year_level} 
                    onChange={e => setProfileData(prev => ({
                      ...prev,
                      year_level: e.target.value
                    }))} 
                    placeholder="Enter your year level" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Input 
                  id="gender" 
                  value={profileData.gender} 
                  onChange={e => setProfileData(prev => ({
                    ...prev,
                    gender: e.target.value
                  }))} 
                  placeholder="Enter your gender" 
                />
              </div>
              
              <Button type="submit" disabled={loading} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {/* Password Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input 
                  id="new_password" 
                  type="password" 
                  value={passwordData.newPassword} 
                  onChange={e => setPasswordData(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))}
                  placeholder="Enter new password" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input 
                  id="confirm_password" 
                  type="password" 
                  value={passwordData.confirmPassword} 
                  onChange={e => setPasswordData(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))} 
                  placeholder="Confirm new password" 
                />
              </div>
              <Button type="submit" disabled={loading} className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {loading ? 'Updating...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Account Role</Label>
                <p className="capitalize font-medium">{profile?.role}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                <p className="font-medium">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                <p className="font-medium">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};