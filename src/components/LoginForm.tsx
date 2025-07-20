import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MultiStepSignupForm } from './MultiStepSignupForm';
export const LoginForm = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const {
    signIn
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isForgotPassword) {
        const {
          error
        } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/reset-password`
        });
        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Reset Email Sent",
            description: "Please check your email for password reset instructions."
          });
          setIsForgotPassword(false);
          setResetEmail('');
        }
        setIsLoading(false);
        return;
      }
      const result = await signIn(studentId, password);
      if (result.error) {
        toast({
          title: "Authentication Error",
          description: result.error.message || "An error occurred during authentication",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome back!"
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const resetForm = () => {
    setPassword('');
    setStudentId('');
    setResetEmail('');
    setIsSignUp(false);
    setIsForgotPassword(false);
  };
  if (isForgotPassword) {
    return <Card className="w-full max-w-md bg-white shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold text-primary flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsForgotPassword(false)} className="p-1 h-auto text-base bg-[#3C83F6] hover:bg-[#3c83f6] text-slate-50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Reset Password
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive password reset instructions
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email Address</Label>
              <Input id="resetEmail" type="email" placeholder="Enter your email address" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
            </div>
            
            <Button type="submit" className="w-full bg-primary hover:bg-primary-600" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Email'}
            </Button>
          </form>
        </CardContent>
      </Card>;
  }
  if (isSignUp) {
    return <MultiStepSignupForm onBackToLogin={() => setIsSignUp(false)} />;
  }
  return <Card className="w-full max-w-md bg-white shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-semibold text-primary">
          Vote Now!
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Every vote matters
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input id="studentId" type="text" placeholder="enter your student id" value={studentId} onChange={e => setStudentId(e.target.value)} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="text-right">
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => setIsForgotPassword(true)}>
              Forgot your password?
            </button>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary-600" disabled={isLoading}>
            {isLoading ? 'Please wait...' : 'Login'}
          </Button>

          <div className="text-center">
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => setIsSignUp(true)}>
              Don't have an account? Sign up
            </button>
          </div>
        </form>
      </CardContent>
    </Card>;
};