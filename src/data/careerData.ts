import type { SprintTicket } from '../types/game';

export interface CareerPath {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  matchScore: number;
  skillsRequired: string[];
  nodesCount: number;
}

export const careerPaths: CareerPath[] = [
  {
    id: 'backend',
    name: 'Backend Engineer',
    role: 'Server Architect & API Specialist',
    description: 'Master REST APIs, PostgreSQL databases, caching layers, microservices, and system scalability.',
    icon: 'Server',
    matchScore: 92,
    skillsRequired: ['Python / Node.js', 'PostgreSQL', 'Redis', 'Docker', 'System Design'],
    nodesCount: 24
  },
  {
    id: 'ai-engineer',
    name: 'AI & LLM Engineer',
    role: 'AI Agent & Model Developer',
    description: 'Build LangChain autonomous agents, vector embeddings, fine-tune models, and design rag pipelines.',
    icon: 'Cpu',
    matchScore: 88,
    skillsRequired: ['Python', 'Vector DBs', 'LangGraph', 'PyTorch', 'Prompt Design'],
    nodesCount: 28
  },
  {
    id: 'fullstack',
    name: 'Full-Stack Developer',
    role: 'End-to-End Product Creator',
    description: 'Combine React frontend user experiences with scalable web APIs and database persistence.',
    icon: 'Layers',
    matchScore: 95,
    skillsRequired: ['React / TypeScript', 'FastAPI', 'Tailwind', 'Database ORM', 'CI/CD'],
    nodesCount: 30
  },
  {
    id: 'system-architect',
    name: 'Software Architect',
    role: 'High-Throughput Systems Specialist',
    description: 'Design distributed architectures handling 50,000 req/sec with rate-limiting, message queues, and zero downtime.',
    icon: 'ShieldAlert',
    matchScore: 78,
    skillsRequired: ['Kafka', 'Kubernetes', 'CAP Theorem', 'Load Balancing', 'Security'],
    nodesCount: 35
  }
];

export const virtualCompanyTickets: SprintTicket[] = [
  {
    id: 'TC-101',
    title: 'FIX-101: Memory Leak in OAuth Token Verifier',
    type: 'Bug',
    priority: 'Critical',
    assignedTo: 'Aether (You)',
    status: 'In Progress',
    rewardXp: 400,
    codeContext: `def verify_token(raw_header):
    # BUG: Cache grows infinitely without eviction ttl!
    token = raw_header.split(" ")[1]
    if token not in TOKEN_CACHE:
        TOKEN_CACHE[token] = fetch_user_claims(token)
    return TOKEN_CACHE[token]`
  },
  {
    id: 'TC-104',
    title: 'FEAT-202: Implement Sliding Window Rate Limiter',
    type: 'Feature',
    priority: 'High',
    assignedTo: 'Aether (You)',
    status: 'PR Review',
    rewardXp: 500,
    codeContext: `class RateLimiter:
    def __init__(self, limit=100, window_sec=60):
        self.limit = limit
        self.window = window_sec
        self.requests = {}`
  },
  {
    id: 'TC-108',
    title: 'INCIDENT-99: Database Connection Pool Starvation',
    type: 'Incident',
    priority: 'Critical',
    assignedTo: 'Backend Team',
    status: 'Backlog',
    rewardXp: 650,
    codeContext: `async function acquireConnection() {
  // Missing timeout release handler!
  const conn = await pool.getConnection();
  return conn;
}`
  }
];
