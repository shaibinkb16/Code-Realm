const API_BASE_URL = 'http://localhost:8000/api/v1';

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

  async runCode(challengeId: string, code: string, language: string = 'python') {
    try {
      const res = await fetch(`${API_BASE_URL}/execute/run`, {
        method: 'POST',
        headers: this.getHeaders(),
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
      const res = await fetch(`${API_BASE_URL}/execute/submit`, {
        method: 'POST',
        headers: this.getHeaders(),
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
      const res = await fetch(`${API_BASE_URL}/ai/mentor/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ message, mode, skill_rating: skillRating })
      });
      if (!res.ok) throw new Error('AI Mentor service unavailable');
      return await res.json();
    } catch (err) {
      return null;
    }
  }
}

export const api = new ApiClient();
