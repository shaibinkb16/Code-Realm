// Resolve API base URL with environment override. Defaults to localhost during
// local development, and to the deployed backend in production.
const DEFAULT_API = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:8000/api/v1'
  : 'https://code-realm.onrender.com/api/v1';

export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API;

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
}

export const api = new ApiClient();
