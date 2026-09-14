import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { api, API_BASE_URL } from '../../services/api';
import type { CodeReviewResponse } from '../../services/api';
import { AITeacherPanel } from './AITeacherPanel';
import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import { FormattedText } from '../ui/FormattedText';
import {
  Play,
  CheckCircle,
  XCircle,
  Terminal,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  Zap,
  Loader,
  X,
  MessageSquare,
  ArrowRight,
  SkipForward
} from 'lucide-react';

interface AITestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description: string;
}

interface AIChallenge {
  title: string;
  type: string;
  difficulty: string;
  description: string;
  storyContext: string;
  initialCode: string;
  language: string;
  testCases: AITestCase[];
  hints: string[];
  explanation: string;
  xpReward: number;
  coinReward: number;
}

interface TestResult {
  test_id: string;
  description: string;
  passed: boolean;
  expected_output: string;
  actual_output: string;
}

interface ExecutionResult {
  status: string;
  all_passed: boolean;
  output: string;
  execution_time_ms: number;
  stars_earned: number;
  xp_earned: number;
  coins_earned: number;
  test_results: TestResult[];
}

const API_BASE = API_BASE_URL;
const TOTAL_QUESTIONS = 15;

export const ChallengeEditor: React.FC = () => {
  const { activeNode, setActiveTab, completeChallenge, profile, setProfile, theme, activeSubLevelIdx, setActiveSubLevelIdx } = useGame();

  const [challenge, setChallenge] = useState<AIChallenge | null>(null);
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [hasPassedAll, setHasPassedAll] = useState(false);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [codeReview, setCodeReview] = useState<CodeReviewResponse | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  const [isSwapping, setIsSwapping] = useState(false);
  const [skippedQuestions, setSkippedQuestions] = useState<number[]>([]);
  const [subLevelIdx, setSubLevelIdx] = useState<number>(() => {
    if (activeSubLevelIdx) return activeSubLevelIdx;
    if (activeNode) {
      const subLevels = activeNode.subLevels || [];
      const firstUncompleted = subLevels.findIndex(s => !profile.completedNodeIds.includes(s.id));
      return firstUncompleted >= 0 ? firstUncompleted + 1 : 1;
    }
    return 1;
  });

  const generateChallenge = async (lang: string, subIdx: number = subLevelIdx) => {
    setIsLoadingChallenge(true);
    setLoadError(null);
    setCode('');
    setOutput('');
    setTestResults([]);
    setHasPassedAll(false);

    const nodeId = activeNode?.id || 'node-loop-1';
    const nodeTitle = activeNode?.title || 'The Unknown Trial';
    const realmName = activeNode?.realmId || 'Code Realm';
    const nodeType = activeNode?.type || 'challenge';

    try {
      const token = localStorage.getItem('coderealm_token');
      const params = new URLSearchParams({
        node_id: nodeId,
        node_title: nodeTitle,
        realm_name: realmName,
        node_type: nodeType,
        skill_rating: String(profile.rankRating || 905),
        target_language: lang,
        sub_level_index: String(subIdx)
      });

      const resp = await fetch(`${API_BASE}/challenges/generate?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);

      const data = await resp.json();
      const aiChallenge: AIChallenge = data.challenge;

      setChallenge(aiChallenge);
      setCode(data.savedCode || aiChallenge.initialCode);
      setSelectedLanguage(aiChallenge.language?.toLowerCase() || lang);
    } catch (err) {
      setLoadError('Could not connect to the AI backend.');
    } finally {
      setIsLoadingChallenge(false);
    }
  };

  const handleGoToQuestion = (targetIdx: number) => {
    const bounded = Math.max(1, Math.min(TOTAL_QUESTIONS, targetIdx));
    setSubLevelIdx(bounded);
    if (setActiveSubLevelIdx) setActiveSubLevelIdx(bounded);
    setIsFeedbackOpen(false);
    setTestResults([]);
    setHasPassedAll(false);
    setOutput(`🚀 Navigated to Question ${bounded}. Loading challenge scaffold...`);
    generateChallenge(selectedLanguage, bounded);
  };

  const handleNextQuestion = () => {
    if (subLevelIdx >= TOTAL_QUESTIONS) {
      const skippedSummary = skippedQuestions.length > 0 ? ` Skipped: ${skippedQuestions.sort((a, b) => a - b).join(', ')}.` : '';
      setOutput(`🏁 You are already on Question ${TOTAL_QUESTIONS} (final question).${skippedSummary}`);
      return;
    }
    handleGoToQuestion(subLevelIdx + 1);
  };

  const handleSkipQuestion = () => {
    setSkippedQuestions(prev => (prev.includes(subLevelIdx) ? prev : [...prev, subLevelIdx]));

    if (subLevelIdx >= TOTAL_QUESTIONS) {
      const updated = skippedQuestions.includes(subLevelIdx) ? skippedQuestions : [...skippedQuestions, subLevelIdx];
      setOutput(`⏭️ Question ${subLevelIdx} skipped. This is Question ${TOTAL_QUESTIONS}/${TOTAL_QUESTIONS}.` +
        ` Skipped Questions: ${updated.sort((a, b) => a - b).join(', ')}`);
      return;
    }

    handleGoToQuestion(subLevelIdx + 1);
  };

  const handleSwapChallenge = async () => {
    if (!challenge || isSwapping) return;
    setIsSwapping(true);
    try {
      const token = localStorage.getItem('coderealm_token');
      const nodeId = activeNode?.id || 'node-loop-1';
      const resp = await fetch(`${API_BASE}/challenges/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          node_id: nodeId,
          target_language: selectedLanguage
        })
      });
      if (!resp.ok) throw new Error('Swap request failed');
      const data = await resp.json();
      setChallenge(data.challenge);
      setCode(data.savedCode || data.challenge.initialCode);
      setTestResults([]);
      setHasPassedAll(false);
      setOutput(`🔄 Swapped! ${data.message || ''}`);
    } catch (err) {
      setOutput('❌ Could not swap to alternate challenge.');
    } finally {
      setIsSwapping(false);
    }
  };

  useEffect(() => {
    let targetIdx = activeSubLevelIdx;
    if (!targetIdx && activeNode) {
      const subLevels = activeNode.subLevels || [];
      const firstUncompleted = subLevels.findIndex(s => !profile.completedNodeIds.includes(s.id));
      targetIdx = firstUncompleted >= 0 ? firstUncompleted + 1 : 1;
    }
    const finalIdx = Math.max(1, Math.min(TOTAL_QUESTIONS, targetIdx || 1));
    setSubLevelIdx(finalIdx);
    generateChallenge(selectedLanguage, finalIdx);
  }, [activeNode?.id, activeSubLevelIdx]);

  // ... rest of component unchanged for brevity in this patch body
  return <div />;
};
