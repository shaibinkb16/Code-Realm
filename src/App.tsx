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
import { AdminConsole } from './components/admin/AdminConsole';
import { AdminDashboardPortal } from './components/admin/AdminDashboardPortal';
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
      case 'admin':
        return <AdminConsole />;
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

        <main className="page-content" style={{ padding: (activeTab === 'challenge' || activeTab === 'world') ? 0 : 'var(--page-padding)', overflow: activeTab === 'world' ? 'hidden' : 'auto' }}>
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
  const [isPreviewStudentView, setIsPreviewStudentView] = useState(false);

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

  // Administrators log directly into the dedicated Admin Dashboard Portal
  if ((user.role === 'admin' || user.role === 'super_admin') && !isPreviewStudentView) {
    return <AdminDashboardPortal onSwitchToStudentView={() => setIsPreviewStudentView(true)} />;
  }

  return (
    <GameProvider>
      {(user.role === 'admin' || user.role === 'super_admin') && isPreviewStudentView && (
        <div style={{ background: '#ef4444', color: '#ffffff', padding: '6px 16px', fontSize: '12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 9999 }}>
          <span>👁️ PREVIEW MODE: You are currently previewing the Student Gaming Interface as {user.username}.</span>
          <button
            onClick={() => setIsPreviewStudentView(false)}
            style={{ background: '#ffffff', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', fontSize: '11px' }}
          >
            ← Return to Admin Control Tower
          </button>
        </div>
      )}
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
