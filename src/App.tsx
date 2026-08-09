import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AuthView } from './components/auth/AuthView';
import { Sidebar } from './components/layout/Sidebar';
import { HeaderBar } from './components/layout/HeaderBar';
import { AICompanionModal } from './components/layout/AICompanionModal';
import { AdaptiveAssessmentModal } from './components/onboarding/AdaptiveAssessmentModal';
import { SpotlightTour } from './components/onboarding/SpotlightTour';
import { WorldMap } from './components/world/WorldMap';
import { ChallengeEditor } from './components/challenge/ChallengeEditor';
import { BossFight } from './components/boss/BossFight';
import { CodeDuel } from './components/duels/CodeDuel';
import { Leaderboards } from './components/leaderboards/Leaderboards';
import { Championship } from './components/championship/Championship';
import { DeveloperHQ } from './components/hq/DeveloperHQ';
import { CareerCompany } from './components/career/CareerCompany';
import { PlayerProfileView } from './components/profile/PlayerProfile';
import { Sparkles } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeTab, notification, setIsAiModalOpen } = useGame();
  const [isAssessmentOpen, setIsAssessmentOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'world':
        return <WorldMap />;
      case 'challenge':
        return <ChallengeEditor />;
      case 'boss':
        return <BossFight />;
      case 'duel':
        return <CodeDuel />;
      case 'leaderboards':
        return <Leaderboards />;
      case 'championship':
        return <Championship />;
      case 'hq':
        return <DeveloperHQ />;
      case 'career':
        return <CareerCompany />;
      case 'profile':
        return <PlayerProfileView />;
      default:
        return <WorldMap />;
    }
  };

  return (
    <div className="app-container">
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)} 
      />

      <Sidebar 
        onOpenAiModal={() => setIsAiModalOpen(true)} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="main-content">
        <HeaderBar 
          onOpenAssessment={() => setIsAssessmentOpen(true)} 
          onToggleMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        <main className="page-content" style={{ padding: activeTab === 'challenge' ? 0 : 'var(--page-padding)' }}>
          {renderActiveView()}
        </main>
      </div>

      <AICompanionModal />
      <AdaptiveAssessmentModal isOpen={isAssessmentOpen} onClose={() => setIsAssessmentOpen(false)} />
      <SpotlightTour />

      {notification && (
        <div className="toast-banner">
          <Sparkles size={16} />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--accent-primary)' }}></div>
          <div>Initializing Code Realm...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <GameProvider>
      <MainAppContent />
    </GameProvider>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
