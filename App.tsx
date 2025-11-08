


import React, { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { OnboardingScreen } from './components/OnboardingScreen';
import { HealthCheckScreen } from './components/HealthCheckScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { ProtocolSelectionScreen } from './components/ProtocolSelectionScreen';
import { CustomProtocolScreen } from './components/CustomProtocolScreen';
import { SessionSettingsScreen } from './components/SessionSettingsScreen';
import { WellbeingCheckScreen } from './components/WellbeingCheckScreen';
import { SessionScreen } from './components/SessionScreen';
import { SummaryScreen } from './components/SummaryScreen';
import { AdminPanel } from './components/admin/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
import { HistoryDetailScreen } from './components/HistoryDetailScreen';
import { ProfileSettingsScreen } from './components/ProfileSettingsScreen';
import { AppState, Goal, VOICES } from './types';
import type { Protocol, SessionLog, UserPreferences, TimerStyle, VoiceName } from './types';

type WellbeingData = {
  hydration: number;
  energy: number;
  mood: 'stressed' | 'neutral' | 'calm';
  intention: string;
};

type SessionSettings = {
    voiceGuidance: boolean;
    voice: VoiceName;
};

const DEFAULT_PREFERENCES: UserPreferences = {
    defaultTimerStyle: 'circle',
    defaultVolume: 0.5,
    defaultVoiceGuidance: true,
    defaultVoice: 'Kore',
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Loading);
  const [session, setSession] = useState<Session | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionLog[]>([]);
  const [lastCompletedSession, setLastCompletedSession] = useState<SessionLog | null>(null);
  const [wellbeingData, setWellbeingData] = useState<WellbeingData | null>(null);
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<SessionLog | null>(null);
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>({ voiceGuidance: true, voice: 'Kore' });
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);


  useEffect(() => {
    // FIX: Using Supabase v1 API for onAuthStateChange to resolve type errors.
    const authListener = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const healthCheckAccepted = localStorage.getItem('saunaflow_health_check_accepted') === 'true';

      if (!healthCheckAccepted) {
        setAppState(AppState.HealthCheck);
      } else if (!session) {
        setAppState(AppState.Auth);
      } else {
        setAppState(AppState.Loading);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, goal, default_timer_style, default_volume, default_voice_guidance, default_voice')
          .eq('id', session.user.id)
          .single();
        
        // PGRST116: "JSON object requested, but row count returned was 0" means no profile found, which is not an error here.
        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching profile:", profileError.message, profileError.details);
          setAppState(AppState.Auth);
          return;
        }

        if (profile) {
          setUsername(profile.username);
          setGoal(profile.goal as Goal);
          
          const dbVoice = profile.default_voice;
          let finalVoice: VoiceName = DEFAULT_PREFERENCES.defaultVoice;

          if (dbVoice) {
              // Handle old 'male'/'female' values for backward compatibility
              if (dbVoice === 'male') {
                  finalVoice = 'Puck';
              } else if (dbVoice === 'female') {
                  finalVoice = 'Kore';
              // Handle new VoiceName values, ensuring it's a valid voice
              } else if ((VOICES as readonly string[]).includes(dbVoice)) {
                  finalVoice = dbVoice as VoiceName;
              }
          }

          setUserPreferences({
              defaultTimerStyle: profile.default_timer_style || DEFAULT_PREFERENCES.defaultTimerStyle,
              defaultVolume: profile.default_volume ?? DEFAULT_PREFERENCES.defaultVolume,
              defaultVoiceGuidance: profile.default_voice_guidance ?? DEFAULT_PREFERENCES.defaultVoiceGuidance,
              defaultVoice: finalVoice,
          });

          const { data: history, error: historyError } = await supabase
            .from('session_history')
            .select('*')
            .eq('user_id', session.user.id)
            .order('date', { ascending: false });

          if (historyError) {
            console.error("Error fetching session history:", historyError.message, historyError.details);
          } else {
            setSessionHistory(history || []);
          }
          setAppState(AppState.Dashboard);
        } else {
          setAppState(AppState.Onboarding);
        }
      }
    });

    return () => {
      // FIX: The `unsubscribe` method is on the `subscription` object in Supabase v2.
      authListener.data.subscription.unsubscribe();
    };
  }, []);
  
  // Safely check for inconsistent states.
  useEffect(() => {
    const statesRequiringProtocol: AppState[] = [
        AppState.SessionSettings,
        AppState.WellbeingCheck,
        AppState.InSession,
    ];
    if (statesRequiringProtocol.includes(appState) && !selectedProtocol) {
      console.warn(`Inconsistent state: ${AppState[appState]} without a protocol. Returning to dashboard.`);
      setAppState(AppState.Dashboard);
    }
    if (appState === AppState.Summary && !lastCompletedSession) {
      console.warn("Inconsistent state: Summary without session log. Returning to dashboard.");
      setAppState(AppState.Dashboard);
    }
    if (appState === AppState.HistoryDetail && !selectedHistoryLog) {
      console.warn("Inconsistent state: History detail without session log. Returning to dashboard.");
      setAppState(AppState.Dashboard);
    }
  }, [appState, selectedProtocol, lastCompletedSession, selectedHistoryLog]);

  const handleHealthCheckComplete = () => {
    localStorage.setItem('saunaflow_health_check_accepted', 'true');
    if (!session) {
        setAppState(AppState.Auth);
    }
    // The onAuthStateChange listener will handle fetching the profile or redirecting to Onboarding.
  };
  
  const handleDevLogin = async () => {
      // Create a mock session object. The user ID must be a valid UUID for Supabase RLS to work.
      const devSession = {
        user: { 
            id: '8d12a197-24d9-43e8-8e8a-2e4a6b28eb7a', // A sample UUID
            email: 'dev@saunaflow.com' 
        },
        // Add other required properties of the Session object, even if they are null
        access_token: 'dev-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'dev-refresh-token',
      } as unknown as Session;
      
      setSession(devSession);
      // Manually trigger the logic that onAuthStateChange would handle
      setAppState(AppState.Loading);
      const { data: profile } = await supabase
          .from('profiles')
          .select('username, goal')
          .eq('id', devSession.user.id)
          .single();

      if (profile) {
        setUsername(profile.username);
        setGoal(profile.goal as Goal);
        const { data: history } = await supabase
            .from('session_history')
            .select('*')
            .eq('user_id', devSession.user.id)
            .order('date', { ascending: false });
        setSessionHistory(history || []);
        setAppState(AppState.Dashboard);
      } else {
        setAppState(AppState.Onboarding);
      }
  };

  const handleOnboardingComplete = async (name: string, selectedGoal: Goal) => {
    if (!session) return;

    // Bypass database for dev user to avoid RLS/foreign key errors
    if (session.user.email === 'dev@saunaflow.com') {
      setUsername(name);
      setGoal(selectedGoal);
      setAppState(AppState.Dashboard);
      return;
    }
    
    const { error } = await supabase.from('profiles').insert([{
      id: session.user.id,
      username: name,
      goal: selectedGoal
    }]);

    if (error) {
      console.error("Error saving profile:", error.message, error.details);
      // TODO: Show an error message to the user
    } else {
      setUsername(name);
      setGoal(selectedGoal);
      setAppState(AppState.Dashboard);
    }
  };

  const handleStartRitual = () => {
    setAppState(AppState.ProtocolSelection);
  };

  const handleCreateCustomRitual = () => {
    setAppState(AppState.CustomProtocol);
  };

  const handleProtocolSelected = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setAppState(AppState.SessionSettings);
  };

  const handleProceedToWellbeing = (protocol: Protocol, settings: SessionSettings) => {
    setSelectedProtocol(protocol);
    setSessionSettings(settings);
    setAppState(AppState.WellbeingCheck);
  };
  
  const handleWellbeingComplete = (data: WellbeingData) => {
    if (!selectedProtocol) return; // Guard against inconsistent state
    setWellbeingData(data);
    setAppState(AppState.InSession);
  };

  const handleStartSession = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setAppState(AppState.InSession);
  };
  
  const handleExitSession = () => {
    setSelectedProtocol(null);
    setWellbeingData(null);
    setAppState(AppState.Dashboard);
  };

  const handleSessionComplete = useCallback(async (sessionLog: Omit<SessionLog, 'hydration' | 'energy' | 'mood' | 'intention'>) => {
    if (!session) return;
    
    const completedSession: SessionLog = {
        ...sessionLog,
        ...(wellbeingData || {}),
        intention: wellbeingData?.intention || undefined
    };

    const { error } = await supabase.from('session_history').insert({
      ...completedSession,
      user_id: session.user.id,
    });

    if (error) {
      console.error("Error saving session history:", error.message, error.details);
    }

    const newHistory = [completedSession, ...sessionHistory];
    setSessionHistory(newHistory);
    setLastCompletedSession(completedSession);
    setAppState(AppState.Summary);
    setWellbeingData(null); // Clear after use
  }, [sessionHistory, session, wellbeingData]);

  const handleBackToDashboard = () => {
    setSelectedProtocol(null);
    setLastCompletedSession(null);
    setWellbeingData(null);
    setSelectedHistoryLog(null);
    setAppState(AppState.Dashboard);
  };
  
  const handleBackToProtocolSelection = () => {
    setSelectedProtocol(null);
    setAppState(AppState.ProtocolSelection);
  }

  const handleBackToSessionSettings = () => {
    setAppState(AppState.SessionSettings);
  };

  const handleViewHistoryDetail = (log: SessionLog) => {
    setSelectedHistoryLog(log);
    setAppState(AppState.HistoryDetail);
  };
  
  const handleGoToProfileSettings = () => {
      setAppState(AppState.ProfileSettings);
  };
  
  const handleSaveProfileSettings = async (
    newName: string,
    newGoal: Goal,
    newPreferences: UserPreferences
  ) => {
      if (!session) return;
      
      const oldUsername = username;
      const oldGoal = goal;
      const oldPreferences = userPreferences;

      // Optimistic UI update
      setUsername(newName);
      setGoal(newGoal);
      setUserPreferences(newPreferences);
      setAppState(AppState.Dashboard);

      const { error } = await supabase
        .from('profiles')
        .update({
            username: newName,
            goal: newGoal,
            default_timer_style: newPreferences.defaultTimerStyle,
            default_volume: newPreferences.defaultVolume,
            default_voice_guidance: newPreferences.defaultVoiceGuidance,
            default_voice: newPreferences.defaultVoice,
        })
        .eq('id', session.user.id);
      
      if (error) {
          console.error("Error updating profile:", error.message, error.details);
          // Revert on error
          setUsername(oldUsername);
          setGoal(oldGoal);
          setUserPreferences(oldPreferences);
          // Optionally show an error message to the user
      }
  };

  const handleResetApp = async () => {
    // FIX: Updated deprecated `logout()` to the current `signOut()` method.
    await supabase.auth.signOut();
    // Clear local state to prevent flash of old content
    setSession(null);
    setGoal(null);
    setUsername(null);
    setSessionHistory([]);
    setLastCompletedSession(null);
    // onAuthStateChange will set appState to Auth
  };
  
  const handleEnterAdmin = () => {
    setAppState(AppState.AdminPanel);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.Loading:
        return (
          <div className="flex items-center justify-center h-screen bg-slate-900">
            <div className="text-white text-xl">Loading SaunaFlow...</div>
          </div>
        );
      case AppState.HealthCheck:
        return <HealthCheckScreen onComplete={handleHealthCheckComplete} />;
      case AppState.Auth:
        return <AuthScreen onDevLogin={handleDevLogin} />;
      case AppState.Onboarding:
        return <OnboardingScreen onOnboardingComplete={handleOnboardingComplete} />;
      case AppState.Dashboard:
        return <DashboardScreen 
                  session={session}
                  username={username}
                  goal={goal} 
                  sessionHistory={sessionHistory}
                  onStartRitual={handleStartRitual}
                  onResetApp={handleResetApp}
                  onEnterAdmin={handleEnterAdmin}
                  onViewHistoryDetail={handleViewHistoryDetail}
                  onGoToProfileSettings={handleGoToProfileSettings}
                />;
      case AppState.ProfileSettings:
        if (!session) return null;
        return <ProfileSettingsScreen
                session={session}
                username={username}
                goal={goal}
                preferences={userPreferences}
                onSave={handleSaveProfileSettings}
                onBack={handleBackToDashboard}
                />;
      case AppState.ProtocolSelection:
        return <ProtocolSelectionScreen 
                  goal={goal} 
                  onProtocolSelected={handleProtocolSelected}
                  onBack={handleBackToDashboard}
                  onCustomRitual={handleCreateCustomRitual}
                />;
      case AppState.CustomProtocol:
        return <CustomProtocolScreen
                  goal={goal}
                  onStartProtocol={handleProtocolSelected}
                  onBack={handleBackToProtocolSelection}
                />;
      case AppState.SessionSettings:
        if (!selectedProtocol) return null;
        return <SessionSettingsScreen 
                  protocol={selectedProtocol}
                  defaultVoiceGuidance={userPreferences.defaultVoiceGuidance}
                  defaultVoice={userPreferences.defaultVoice}
                  onStart={handleProceedToWellbeing}
                  onBack={handleBackToProtocolSelection}
                />;
      case AppState.WellbeingCheck:
        if (!selectedProtocol) return null;
        return <WellbeingCheckScreen
                    onComplete={handleWellbeingComplete}
                    onBack={handleBackToSessionSettings}
                />;
      case AppState.InSession:
        if (!selectedProtocol) return null;
        return <SessionScreen 
                  protocol={selectedProtocol} 
                  onSessionComplete={handleSessionComplete} 
                  onExit={handleExitSession}
                  voiceGuidanceEnabled={sessionSettings.voiceGuidance}
                  voice={sessionSettings.voice}
                  defaultTimerStyle={userPreferences.defaultTimerStyle}
                  defaultVolume={userPreferences.defaultVolume}
                />;
      case AppState.Summary:
        if (!lastCompletedSession) return null;
        return <SummaryScreen 
                  sessionLog={lastCompletedSession} 
                  onDone={handleBackToDashboard} 
                />;
      case AppState.AdminPanel:
        return <AdminPanel onExit={handleBackToDashboard} />;
      case AppState.HistoryDetail:
        if (!selectedHistoryLog) return null;
        return <HistoryDetailScreen
                sessionLog={selectedHistoryLog}
                onBack={handleBackToDashboard}
                />;
      default:
        return (
          <div className="flex items-center justify-center h-screen bg-slate-900">
            <div className="text-white text-xl">Loading SaunaFlow...</div>
          </div>
        );
    }
  };

  return <div className="min-h-screen bg-slate-900">{renderContent()}</div>;
};

export default App;