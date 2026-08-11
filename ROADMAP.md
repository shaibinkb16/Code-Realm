# AI Coding Learning Platform - Project Roadmap

This roadmap breaks down the development of the AI Coding Learning Platform into manageable batches (phases). We will build this platform batch by batch. 

## Phase 1 — Foundation
*Core infrastructure, authentication, and design system.*

- [x] React/Vite Frontend Setup
- [x] FastAPI Backend Setup
- [x] PostgreSQL Database Integration
- [x] Basic User Authentication (Email/Username)
- [ ] User Profile & Knowledge Graph Schema (Languages, DSA, Problem Solving)
- [x] Design System & Tailwind CSS Integration
- [ ] Redis Integration for Session & Caching
- [ ] Docker compose setup for local development (frontend, api, postgres, redis)

## Phase 2 — Coding Engine
*The core ability to write, execute, and evaluate code.*

- [ ] Code Editor UI (Monaco Editor Integration)
- [ ] Language Configuration Registry (Python, JavaScript, Java, C++, etc.)
- [ ] Problem & Submissions Schema
- [ ] Queue System Setup (Redis/BullMQ or Celery)
- [ ] Docker-based Isolated Sandbox Execution (Workers)
- [ ] Test Case Execution Engine (Public vs Hidden Tests)
- [ ] Submission Status Workflow (Queued -> Running -> Accepted/Failed)

## Phase 3 — Problem Bank
*Intelligent problem generation, validation, and storage.*

- [ ] AI Problem Generation Pipeline (Topic -> Difficulty -> Generator)
- [ ] Automated Code Validation (Reject failing AI problems)
- [ ] Problem Deduplication Engine (Semantic/Fingerprint similarity)
- [ ] Problem Variants System (Same problem, different languages/difficulties)
- [ ] Problem Quality Scoring & Human Review Queue
- [ ] Permanent Problem Storage & Tagging

## Phase 4 — Learning Intelligence
*The adaptive engine that understands the user and recommends what's next.*

- [ ] Initial Knowledge Assessment (Diagnostic quiz)
- [ ] Learner Mastery Engine (Updating skill % based on performance)
- [ ] Mistake & Misconception Tracking
- [ ] User-Controlled Practice Modes (Free, Adaptive, Blind, Speed, Revision)
- [ ] Next Best Problem Recommendation Algorithm (Deterministic)
- [ ] Dynamic Difficulty Adjustment

## Phase 5 — AI Tutor
*Context-aware assistance without giving away the answers.*

- [ ] Hint System (Level 0 conceptual -> Level 5 solution)
- [ ] AI Solution Explanation (Complexity, Alternatives, Mistake Analysis)
- [ ] Tutor Chat Interface integrated into Code Editor
- [ ] AI Access to Learner Memory (Previous mistakes, hints used)

## Phase 6 — Gamification
*Meaningful rewards and progress tracking.*

- [ ] XP System (Rewards for learning quality, first attempts, no hints)
- [ ] Skill & Competitive Rating System (Elo-style DSA/Language ratings)
- [ ] Streaks & Daily Challenges
- [ ] Achievements & Badges (e.g., "Tree Master")
- [ ] Deterministic Leaderboards (Global, Weekly, Friends)

## Phase 7 — Competitive & Contests
*Live competition and timed assessments.*

- [ ] Contest Creation & Management
- [ ] Timed Interview Simulation Mode
- [ ] Live Leaderboards & Submissions
- [ ] Anti-Cheat Measures (Timing, Similarity, Focus tracking)

## Phase 8 — Scale & Administration
*Production readiness and platform management.*

- [ ] Admin Dashboard (Manage users, problems, reports)
- [ ] Problem Moderation Queue (User reports -> Admin review)
- [ ] Horizontal Scaling of Execution Workers
- [ ] Analytics & Observability (OpenTelemetry, Grafana)
- [ ] Vector Search Integration (Pinecone) for Semantic Problem Retrieval
- [ ] Platform-level Analytics (Drop-off points, success rates)

---

**Notes for Development:**
- **Security First:** The execution sandbox (Phase 2) must be strictly isolated. No database or internet access for user code.
- **AI vs Deterministic:** AI handles generation, hints, and explanations. The deterministic backend handles execution, scoring, XP, and ratings.
- **Problem Deduplication:** Never blindly store AI output. Always run similarity checks and deterministic test cases first.
