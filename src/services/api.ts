const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.endsWith('.local')
);

const DEFAULT_API = isLocalhost
  ? 'http://localhost:8000/api/v1'
  : 'https://code-realm.onrender.com/api/v1';

export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API;

export interface SkillMasteryEntry {
  name: string;
  category?: string;
  mastery_percentage: number;
  skill_rating: number;
}

export interface BackendAchievement {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  category: string;
  xp_reward: number;
  coin_reward: number;
  unlocked: boolean;
  progress: number;
  target: number;
}

export interface DailyMissionTask {
  id: string;
  label: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface DailyMissionResponse {
  status: string;
  period?: 'daily' | 'weekly';
  tasks: DailyMissionTask[];
  all_completed: boolean;
  claimed: boolean;
  bonus_xp: number;
  bonus_coins: number;
  resets_at: string;
}

export interface GhostPaceResponse {
  median_seconds: number;
  sample_size: number;
  rating_band: string;
}

export interface CodeReviewResponse {
  status: string;
  overall_score: number;
  breakdown: {
    correctness: number;
    performance: number;
    readability: number;
    security: number;
    maintainability: number;
  };
  summary: string;
  source: 'ai' | 'heuristic';
}

export interface SkillMasteryResponse {
  status: string;
  languages: SkillMasteryEntry[];
  topics: SkillMasteryEntry[];
  weakest_topic: string | null;
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('coderealm_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    options.headers = this.getHeaders();
    let res = await fetch(url, options);

    if (res.status === 401) {
      // Attempt to refresh token
      const refreshToken = localStorage.getItem('coderealm_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
          });
          
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('coderealm_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('coderealm_refresh_token', data.refresh_token);
            }
            
            // Retry original request with new token
            options.headers = this.getHeaders();
            res = await fetch(url, options);
          } else {
            // Refresh failed, clear session
            localStorage.removeItem('coderealm_token');
            localStorage.removeItem('coderealm_refresh_token');
          }
        } catch (e) {
          localStorage.removeItem('coderealm_token');
          localStorage.removeItem('coderealm_refresh_token');
        }
      } else {
        localStorage.removeItem('coderealm_token');
      }
    }
    return res;
  }

  async runCode(challengeId: string, code: string, language: string = 'python') {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/execute/run`, {
        method: 'POST',
        body: JSON.stringify({ challenge_id: challengeId, code, language })
      });
      if (!res.ok) throw new Error('Sandbox execution failed');
      return await res.json();
    } catch (err) {
      console.warn('API execution server unavailable, using client sandbox engine:', err);
      return null;
    }
  }

  async submitCode(challengeId: string, code: string, language: string = 'python') {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/execute/submit`, {
        method: 'POST',
        body: JSON.stringify({ challenge_id: challengeId, code, language })
      });
      if (!res.ok) throw new Error('Submission endpoint failed');
      return await res.json();
    } catch (err) {
      console.warn('API submission server unavailable, using client state engine:', err);
      return null;
    }
  }

  async askAiMentor(message: string, mode: string = 'Explain', skillRating: number = 905) {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/ai/mentor/chat`, {
        method: 'POST',
        body: JSON.stringify({ message, mode, skill_rating: skillRating })
      });
      if (!res.ok) throw new Error('AI Mentor service unavailable');
      return await res.json();
    } catch (err) {
      return null;
    }
  }

  // --- Auth Methods ---
  
  async login(credentials: any) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      // Pass the whole error object so we can check if it's the "Account not verified" error
      throw errorData; 
    }
    return await res.json();
  }

  async register(userData: any) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (Array.isArray(errorData.detail)) {
        throw new Error(errorData.detail.map((e: any) => e.msg).join(", "));
      }
      throw new Error(errorData.detail || 'Registration failed');
    }
    return await res.json();
  }

  async verifyOtp(email: string, otp: string) {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Invalid or expired OTP');
    }
    return await res.json();
  }

  async resendOtp(email: string) {
    const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to resend OTP');
    }
    return await res.json();
  }

  async getMe() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/auth/me`, {
      method: 'GET'
    });
    if (!res.ok) throw new Error('Session expired');
    return await res.json();
  }

  // --- Resource-Oriented Node & Challenge Methods ---

  async getNodeChallenge(nodeId: string, params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/nodes/${nodeId}/challenge?${query}`;
    const res = await this.fetchWithAuth(url, { method: 'GET' });
    if (!res.ok) throw new Error(`Node challenge request failed: ${res.status}`);
    return await res.json();
  }

  async saveChallengeDraft(nodeId: string, code: string) {
    const url = `${API_BASE_URL}/nodes/${nodeId}/challenge/draft`;
    const res = await this.fetchWithAuth(url, {
      method: 'PATCH',
      body: JSON.stringify({ code })
    });
    if (!res.ok) throw new Error(`Draft save failed: ${res.status}`);
    return await res.json();
  }

  async swapNodeChallenge(nodeId: string, targetLanguage: string = 'python') {
    const url = `${API_BASE_URL}/nodes/${nodeId}/challenge/swap?target_language=${targetLanguage}`;
    const res = await this.fetchWithAuth(url, { method: 'POST' });
    if (!res.ok) throw new Error(`Challenge swap failed: ${res.status}`);
    return await res.json();
  }

  // --- Passkey & Session Management Methods ---

  async getPasskeyRegisterOptions() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/auth/passkeys/register/options`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to obtain passkey registration options');
    return await res.json();
  }

  async verifyPasskeyRegistration(payload: any) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/auth/passkeys/register/verify`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Passkey verification failed');
    return await res.json();
  }

  async getPasskeyLoginOptions() {
    const res = await fetch(`${API_BASE_URL}/auth/passkeys/login/options`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to obtain passkey login options');
    return await res.json();
  }

  async verifyPasskeyLogin(payload: any) {
    const res = await fetch(`${API_BASE_URL}/auth/passkeys/login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Passkey authentication failed');
    return await res.json();
  }

  async getSessions() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/auth/sessions`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to list sessions');
    return await res.json();
  }

  async revokeSession(sessionId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/auth/sessions/${sessionId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to revoke session');
    return await res.json();
  }

  async getPasskeys() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/auth/passkeys`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to list passkeys');
    return await res.json();
  }

  async deletePasskey(passkeyId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/auth/passkeys/${passkeyId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete passkey');
    return await res.json();
  }

  async saveOnboarding(data: any) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/auth/onboarding`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save onboarding preferences');
    return await res.json();
  }

  // --- User Profile, HQ & Pet Methods ---

  async getUserProfile() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/user/profile`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return await res.json();
  }

  async saveUserProgress(nodeId: string, difficulty?: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/user/progress`, {
      method: 'POST',
      body: JSON.stringify({ node_id: nodeId, difficulty })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save user progress');
    }
    return await res.json();
  }

  async upgradeHq() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/user/hq/upgrade`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upgrade HQ');
    }
    return await res.json();
  }

  async upgradePet() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/user/pet/upgrade`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upgrade pet');
    }
    return await res.json();
  }

  async getCodeReview(
    code: string,
    challengeTitle: string,
    challengeDescription: string,
    testResults: Array<Record<string, unknown>>,
    skillRating: number
  ): Promise<CodeReviewResponse | null> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/challenges/review`, {
        method: 'POST',
        body: JSON.stringify({
          code,
          challenge_title: challengeTitle,
          challenge_description: challengeDescription,
          test_results: testResults,
          skill_rating: skillRating,
        }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getGhostPace(rating: number): Promise<GhostPaceResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/leaderboards/ghost-pace?rating=${encodeURIComponent(rating)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getAchievements(): Promise<{ status: string; achievements: BackendAchievement[] } | null> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/user/achievements`, { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getDailyMission(): Promise<DailyMissionResponse | null> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/user/daily-mission`, { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async claimDailyMission(): Promise<{ status: string; xp?: number; coins?: number } | null> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/user/daily-mission/claim`, { method: 'POST' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getWeeklyMission(): Promise<DailyMissionResponse | null> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/user/weekly-mission`, { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async claimWeeklyMission(): Promise<{ status: string; xp?: number; coins?: number } | null> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/user/weekly-mission/claim`, { method: 'POST' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getSkillMastery(): Promise<SkillMasteryResponse | null> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE_URL}/user/mastery`, { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async claimPassiveIncome() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/user/hq/claim-passive`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to claim passive income');
    }
    return await res.json();
  }

  async submitFeedback(data: { category: string; rating: number; message: string }) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/user/feedback`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit feedback');
    }
    return await res.json();
  }

  async getMyFeedback() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/user/feedback/my`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch user feedback status');
    return await res.json();
  }

  async getAdminFeedback() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/admin/feedback`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch admin feedback logs');
    return await res.json();
  }

  async updateFeedbackStatus(feedbackId: string, status: string, adminNotes?: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/admin/feedback/${feedbackId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_notes: adminNotes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update feedback status');
    }
    return await res.json();
  }

  async getAdminAnalytics() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/admin/analytics`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch platform analytics');
    return await res.json();
  }

  async deleteUserAccount(userId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete user account');
    }
    return await res.json();
  }

  async bulkReviewChallenges(challengeIds: string[], reviewStatus: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/admin/challenges/bulk-review`, {
      method: 'POST',
      body: JSON.stringify({ challenge_ids: challengeIds, review_status: reviewStatus })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to bulk review challenges');
    }
    return await res.json();
  }
}

export const api = new ApiClient();
