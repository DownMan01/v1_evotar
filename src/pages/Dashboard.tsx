import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, User, LogOut, Moon, LayoutDashboard, Vote, Users, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useElectionStatusUpdater } from '@/hooks/useElectionStatusUpdater';
import { RegistrationStatusGuard } from '@/components/RegistrationStatusGuard';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { NotificationSystem } from '@/components/NotificationSystem';
import { StaffSidebar } from '@/components/StaffSidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { DashboardOverview } from '@/components/DashboardOverview';
import { StaffOverview } from '@/components/StaffOverview';
import { AdminOverview } from '@/components/AdminOverview';
import { Elections } from '@/components/Elections';
import { Candidates } from '@/components/Candidates';
import { Results } from '@/components/Results';
import { Settings } from '@/components/Settings';
import { AdminPanel } from '@/components/AdminPanel';
import { ModernStaffPanel } from '@/components/ModernStaffPanel';


const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Auto-update election statuses
  useElectionStatusUpdater(!!user);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    
    // Handle URL parameters for tab and election selection
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const electionId = urlParams.get('election');
    
    if (tab) {
      setActiveTab(tab);
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">Loading your dashboard...</p>
            <p className="text-sm text-muted-foreground">Please wait while we prepare everything</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const renderMainContent = () => {
    // For staff dashboard
    if (profile?.role === 'Staff') {
      switch (activeTab) {
        case 'dashboard':
          return <StaffOverview />;
        case 'elections':
          return <Elections />;
        case 'candidates':
          return <Candidates />;
        case 'results':
          return <Results />;
        case 'staff-panel':
          return <ModernStaffPanel />;
        case 'settings':
          return <Settings />;
        default:
          return <StaffOverview />;
      }
    }

    // For admin dashboard
    if (profile?.role === 'Administrator') {
      switch (activeTab) {
        case 'dashboard':
          return <AdminOverview />;
        case 'elections':
          return <Elections />;
        case 'candidates':
          return <Candidates />;
        case 'results':
          return <Results />;
        case 'admin-panel':
          return <AdminPanel />;
        case 'settings':
          return <Settings />;
        default:
          return <AdminOverview />;
      }
    }

    // For voters
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'elections':
        return <Elections />;
      case 'candidates':
        return <Candidates />;
      case 'results':
        return <Results />;
      case 'settings':
        return <Settings />;
      default:
        return <DashboardOverview />;
    }
  };

  const renderSidebar = () => {
    switch (profile?.role) {
      case 'Staff':
        return <StaffSidebar activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'Administrator':
        return <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />;
      default:
        return <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} />;
    }
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      elections: 'Elections', 
      candidates: 'Candidates',
      results: 'Results',
      'staff-panel': 'Staff Panel',
      'admin-panel': 'Admin Panel',
      settings: 'Settings',
    };
    return titles[activeTab] || 'Dashboard';
  };

  return (
    <RegistrationStatusGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-10">
          {renderSidebar()}
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* Modern Header */}
          <header className="bg-white/80 backdrop-blur-xl border-b border-border/50 shadow-sm sticky top-0 z-20">
            <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 flex items-center justify-between">
              <div className="animate-in">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  {getPageTitle()}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
                  Welcome back, {profile.full_name || 'User'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2 md:space-x-4">
                {/* Notification System */}
                <NotificationSystem />
                
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-primary hover:shadow-lg transition-all duration-200"
                    >
                      <div className="h-full w-full rounded-full bg-white/20 flex items-center justify-center">
                        <User className="h-3 w-3 md:h-4 md:w-4 text-white" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 md:w-72 p-2">
                    <div className="px-4 py-3 border-b border-border/50">
                      <div className="font-semibold text-foreground text-sm md:text-base">
                        {profile.full_name || 'User'}
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {profile.role} • ID: {profile.student_id || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {profile.email || 'No email'}
                      </div>
                    </div>
                    <DropdownMenuItem 
                      onClick={() => setActiveTab('settings')}
                      className="mt-2 rounded-lg"
                    >
                      <User className="mr-3 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <div className="px-2 py-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                        <Moon className="mr-3 h-4 w-4" />
                        <span className="text-sm font-medium">Dark Mode</span>
                           </div>
                        <ThemeToggle />
                      </div>
                    </div>
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="mt-1 rounded-lg text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Mobile Navigation - Only shown on mobile */}
          <div className="lg:hidden bg-white/90 backdrop-blur-xl border-b border-border/50 px-4 py-2 sticky top-[73px] md:top-[97px] z-20">
            <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
              {(profile?.role === 'Staff' ? [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'elections', label: 'Elections', icon: Vote },
                { id: 'candidates', label: 'Candidates', icon: Users },
                { id: 'results', label: 'Results', icon: TrendingUp },
                { id: 'staff-panel', label: 'Staff', icon: SettingsIcon },
                { id: 'settings', label: 'Settings', icon: SettingsIcon },
              ] : profile?.role === 'Administrator' ? [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'elections', label: 'Elections', icon: Vote },
                { id: 'candidates', label: 'Candidates', icon: Users },
                { id: 'results', label: 'Results', icon: TrendingUp },
                { id: 'admin-panel', label: 'Admin', icon: SettingsIcon },
                { id: 'settings', label: 'Settings', icon: SettingsIcon },
              ] : [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'elections', label: 'Elections', icon: Vote },
                { id: 'candidates', label: 'Candidates', icon: Users },
                { id: 'results', label: 'Results', icon: TrendingUp },
                { id: 'settings', label: 'Settings', icon: SettingsIcon },
              ]).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200",
                      isActive 
                        ? "bg-primary text-white shadow-md" 
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area with improved spacing */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            <div className="animate-in max-w-7xl mx-auto">
              {renderMainContent()}
            </div>
          </main>
        </div>
        
        {/* Modern Decorative Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 right-10 md:top-20 md:right-20 w-32 h-32 md:w-64 md:h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/3 w-48 h-48 md:w-96 md:h-96 bg-primary/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-1/4 md:bottom-20 w-40 h-40 md:w-80 md:h-80 bg-primary/4 rounded-full blur-3xl"></div>
        </div>
      </div>
    </RegistrationStatusGuard>
  );
};

export default Dashboard;