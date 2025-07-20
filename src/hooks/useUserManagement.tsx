import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PendingUser {
  id: string;
  user_id: string;
  student_id: string | null;
  full_name: string | null;
  email: string | null;
  registration_status: string;
  created_at: string;
}

export const useUserManagement = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPendingUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('registration_status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingUser[];
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending users",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const approveUser = useCallback(async (userId: string, adminNotes?: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('approve_user_registration', {
        p_user_id: userId,
        p_admin_notes: adminNotes
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User registration approved successfully",
      });
      return true;
    } catch (error: any) {
      console.error('Error approving user:', error);
      
      // Provide more detailed error message
      let errorMessage = "Failed to approve user registration";
      if (error?.message) {
        if (error.message.includes('Only administrators')) {
          errorMessage = "You don't have permission to approve users. Only administrators can approve user registrations.";
        } else if (error.message.includes('not found')) {
          errorMessage = "User not found or registration already processed";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const rejectUser = useCallback(async (userId: string, adminNotes?: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('reject_user_registration', {
        p_user_id: userId,
        p_admin_notes: adminNotes
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User registration rejected",
      });
      return true;
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      
      // Provide more detailed error message
      let errorMessage = "Failed to reject user registration";
      if (error?.message) {
        if (error.message.includes('Only administrators')) {
          errorMessage = "You don't have permission to reject users. Only administrators can reject user registrations.";
        } else if (error.message.includes('not found')) {
          errorMessage = "User not found or registration already processed";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingUser[];
    } catch (error) {
      console.error('Error fetching all users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    fetchPendingUsers,
    approveUser,
    rejectUser,
    getAllUsers,
  };
};