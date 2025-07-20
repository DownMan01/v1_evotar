import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Elections } from '@/components/Elections';
import { Candidates } from '@/components/Candidates';
import { Results } from '@/components/Results';
import { Settings } from '@/components/Settings';
import { Vote, Users, TrendingUp, SettingsIcon } from 'lucide-react';

export const VoterDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('elections');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Voter Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="elections" className="flex items-center gap-2">
            <Vote className="h-4 w-4" />
            <span className="hidden sm:inline">Elections</span>
          </TabsTrigger>
          <TabsTrigger value="candidates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Candidates</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elections" className="mt-6">
          <Elections />
        </TabsContent>

        <TabsContent value="candidates" className="mt-6">
          <Candidates />
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <Results />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Settings />
        </TabsContent>
      </Tabs>
    </div>
  );
};