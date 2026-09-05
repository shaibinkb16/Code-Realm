import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  CheckCircle,
  Sparkles,
  Terminal,
  Flame,
  Swords,
  MapPin,
  Building,
  RotateCcw,
  Zap,
  Code2
} from 'lucide-react';

export const LandingHeroDemo: React.FC<{ onStartFree: () => void }> = ({ onStartFree }) => {
  const [activeDemoTab, setActiveDemoTab] = useState<'sandbox' | 'worldmap' | 'duel' | 'boss' | 'hq'>('sandbox');
  
  // Interactive Sandbox Code State
  const [code, setCode] = useState<string>(
`# Quest 1.1: The Logic Spark
def activate_portal(energy_cores: list) -> str:
    total_power = sum(energy_cores)
    if total_power >= 100:
        return "✨ PORTAL OPENED • REALM ACCESSIBLE"
    return "⚡ INSUFFICIENT ENERGY"`
  );

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');
  const [outputLogs, setOutputLogs] = useState<string[]>([
    '⚡ Code Realm Kernel v2.4 initialized',
    '⚔️ Ready for test execution — Press "Run Sandbox Quest"'
  ]);

  // Boss HP State for Boss Tab
  const [bossHp, setBossHp] = useState<number>(75);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);

  // Auto-typing demo simulation loop when idle
  useEffect(() => {
    if (activeDemoTab === 'sandbox' && testStatus === 'idle') {
      const timer = setTimeout(() => {
        // Automatically trigger sandbox run for demonstration
        handleRunSandboxCode(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [activeDemoTab, testStatus]);

  const handleRunSandboxCode = (isUserClick = true) => {
    setIsRunning(true);
    setTestStatus('running');
    setOutputLogs([
      '⚙️ Compiling Python syntax tree...',
      '🧪 Running against 3 AI-generated test cases...'
    ]);

    setTimeout(() => {
      setIsRunning(false);
      setTestStatus('passed');
      setOutputLogs([
        '✅ Test 1: activate_portal([50, 60]) == "✨ PORTAL OPENED" -> PASSED (12ms)',
        '✅ Test 2: activate_portal([20, 30]) == "⚡ INSUFFICIENT" -> PASSED (9ms)',
        '✅ Test 3: activate_portal([100]) == "✨ PORTAL OPENED" -> PASSED (8ms)',
        '🎉 ALL 3 TESTS PASSED! +150 XP • +75 Coins • Spark of Logic Unlocked!'
      ]);

      if (isUserClick) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }, 900);
  };

  const handleBossAttack = () => {
    if (bossHp <= 0) {
      setBossHp(100);
      return;
    }
    setIsAttacking(true);
    const dmg = 25;
    const newHp = Math.max(0, bossHp - dmg);
    setBossHp(newHp);

    setTimeout(() => {
      setIsAttacking(false);
      if (newHp === 0) {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
      }
    }, 400);
  };

  return (
    <div className="hero-demo-wrapper">
      {/* Container Glowing Bezel */}
      <div className="hero-demo-card">
        {/* Top Window Bar */}
        <div className="hero-demo-header">
          <div className="window-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>

          <div className="hero-demo-tabs">
            <button
              onClick={() => setActiveDemoTab('sandbox')}
              className={`demo-tab-btn ${activeDemoTab === 'sandbox' ? 'active' : ''}`}
            >
              <Code2 size={14} />
              <span>1. Live Sandbox Quest</span>
            </button>
            <button
              onClick={() => setActiveDemoTab('worldmap')}
              className={`demo-tab-btn ${activeDemoTab === 'worldmap' ? 'active' : ''}`}
            >
              <MapPin size={14} />
              <span>2. RPG World Map</span>
            </button>
            <button
              onClick={() => setActiveDemoTab('duel')}
              className={`demo-tab-btn ${activeDemoTab === 'duel' ? 'active' : ''}`}
            >
              <Swords size={14} />
              <span>3. 1v1 PvP Duel</span>
            </button>
            <button
              onClick={() => setActiveDemoTab('boss')}
              className={`demo-tab-btn ${activeDemoTab === 'boss' ? 'active' : ''}`}
            >
              <Flame size={14} />
              <span>4. Boss Raids</span>
            </button>
            <button
              onClick={() => setActiveDemoTab('hq')}
              className={`demo-tab-btn ${activeDemoTab === 'hq' ? 'active' : ''}`}
            >
              <Building size={14} />
              <span>5. Developer HQ</span>
            </button>
          </div>

          <div className="demo-live-badge">
            <span className="live-ping" />
            <span>LIVE DEMO</span>
          </div>
        </div>

        {/* Dynamic Interactive Demo Views */}
        <div className="hero-demo-viewport">
          {/* TAB 1: LIVE CODE SANDBOX */}
          {activeDemoTab === 'sandbox' && (
            <div className="demo-sandbox-grid">
              <div className="demo-editor-pane">
                <div className="pane-header">
                  <span className="pane-title">solution.py • Level 1: Starter Village</span>
                  <span className="lang-pill">Python 3.14</span>
                </div>
                <textarea
                  className="demo-code-area"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                />
                <div className="demo-action-bar">
                  <button
                    onClick={() => handleRunSandboxCode(true)}
                    disabled={isRunning}
                    className="btn-demo-run"
                  >
                    {isRunning ? <Zap size={15} className="spin-icon" /> : <Play size={15} fill="currentColor" />}
                    <span>{isRunning ? 'Compiling in Sandbox...' : 'Run Sandbox Quest'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setTestStatus('idle');
                      setOutputLogs(['⚡ Reset code buffer. Press "Run Sandbox Quest"']);
                    }}
                    className="btn-demo-reset"
                    title="Reset snippet"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              <div className="demo-terminal-pane">
                <div className="pane-header">
                  <div className="flex-align-gap">
                    <Terminal size={14} color="var(--accent-teal)" />
                    <span className="pane-title">Sandboxed Output & Verification</span>
                  </div>
                  {testStatus === 'passed' && (
                    <span className="badge-pass">
                      <CheckCircle size={12} /> 100% Tests Passed
                    </span>
                  )}
                </div>
                <div className="terminal-body">
                  {outputLogs.map((line, i) => (
                    <div key={i} className={`log-line ${line.includes('PASSED') ? 'log-success' : line.includes('⚡') ? 'log-accent' : ''}`}>
                      {line}
                    </div>
                  ))}
                  {testStatus === 'passed' && (
                    <div className="quest-reward-banner">
                      <div className="reward-info">
                        <Sparkles size={16} color="#fbbf24" />
                        <span><strong>VICTORY!</strong> Waypoint Unlocked: <em>Variable Grove</em></span>
                      </div>
                      <button onClick={onStartFree} className="btn-claim-reward">
                        Play Full RPG Free →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RPG WORLD MAP PREVIEW */}
          {activeDemoTab === 'worldmap' && (
            <div className="demo-worldmap-view">
              <div className="worldmap-preview-header">
                <div>
                  <h4 className="preview-title">🗺️ Realm 1: Starter Village (17 Waypoints)</h4>
                  <p className="preview-sub">1,700 Progressive sub-level trials • Auto-generated by AI Mentor</p>
                </div>
                <button onClick={onStartFree} className="btn-demo-cta">
                  Explore Full Map Free →
                </button>
              </div>

              <div className="worldmap-nodes-track">
                {[
                  { id: '1', title: '1. Spark of Logic', status: 'completed', icon: '✨', stars: '★★★' },
                  { id: '2', title: '2. Variable Grove', status: 'active', icon: '⚡', stars: '★★☆' },
                  { id: '3', title: '3. Syntax Speedrun', status: 'unlocked', icon: '🏃', stars: '☆☆☆' },
                  { id: '4', title: '4. Gatekeeper Logic', status: 'locked', icon: '🛡️', stars: '🔒' },
                  { id: '7', title: '7. Mini-Boss Golem', status: 'boss', icon: '🐲', stars: '🔥' },
                  { id: '17', title: '17. Monarch of Loops', status: 'final-boss', icon: '👑', stars: '🏆' },
                ].map((node) => (
                  <div key={node.id} className={`map-node-card ${node.status}`}>
                    <div className="node-icon-circle">{node.icon}</div>
                    <div className="node-meta">
                      <span className="node-num">WAYPOINT #{node.id}</span>
                      <strong className="node-name">{node.title}</strong>
                      <span className="node-stars">{node.stars}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 1v1 CODE DUEL ARENA */}
          {activeDemoTab === 'duel' && (
            <div className="demo-duel-view">
              <div className="duel-header-bar">
                <div className="fighter player">
                  <div className="avatar-ring">⚔️</div>
                  <div>
                    <div className="fighter-name">Player (You)</div>
                    <div className="fighter-elo">1,420 ELO • Gold League</div>
                  </div>
                </div>

                <div className="duel-timer-badge">
                  <span className="duel-vs">VS</span>
                  <span className="timer-count">00:48</span>
                </div>

                <div className="fighter bot">
                  <div>
                    <div className="fighter-name">AI Challenger: CipherBot</div>
                    <div className="fighter-elo">1,405 ELO • Ranked Match</div>
                  </div>
                  <div className="avatar-ring">🤖</div>
                </div>
              </div>

              <div className="duel-code-race">
                <div className="duel-lane">
                  <div className="lane-tag">Your Code Progress: 3/3 Tests Passed (⚡ Faster)</div>
                  <pre className="duel-snippet">{`def reverse_words(s: str) -> str:\n    return " ".join(s.split()[::-1])`}</pre>
                </div>
                <div className="duel-lane bot-lane">
                  <div className="lane-tag">CipherBot Progress: 2/3 Tests Passed (Typing...)</div>
                  <pre className="duel-snippet">{`def reverse_words(s):\n    words = []\n    # In progress...`}</pre>
                </div>
              </div>

              <div className="duel-footer-cta">
                <span>⚔️ Ranked PvP with real-time Elo rating adjustments & seasonal tournaments</span>
                <button onClick={onStartFree} className="btn-demo-cta">
                  Join Duel Arena →
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: BOSS RAID OVERLORD */}
          {activeDemoTab === 'boss' && (
            <div className="demo-boss-view">
              <div className="boss-showcase-header">
                <div className="boss-title-wrap">
                  <span className="boss-tag">MULTI-PHASE OVERLORD RAID</span>
                  <h3 className="boss-name">🐲 The Corrupted Memory Dragon (Phase 2/3)</h3>
                </div>
                <div className="boss-hp-box">
                  <div className="hp-label">BOSS HP: {bossHp}/100</div>
                  <div className="hp-track">
                    <div className="hp-fill" style={{ width: `${bossHp}%` }} />
                  </div>
                </div>
              </div>

              <div className="boss-action-area">
                <p className="boss-desc">
                  "Solve the recursion depth problem to shatter the dragon's memory corruption shield!"
                </p>
                <div className="boss-buttons-row">
                  <button
                    onClick={handleBossAttack}
                    className={`btn-boss-strike ${isAttacking ? 'strike-anim' : ''}`}
                  >
                    <Flame size={16} />
                    <span>{bossHp === 0 ? 'Respawn Boss' : 'Execute Strike (-25 HP)'}</span>
                  </button>
                  <button onClick={onStartFree} className="btn-demo-cta">
                    Fight Boss in Game →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DEVELOPER HQ & PETS */}
          {activeDemoTab === 'hq' && (
            <div className="demo-hq-view">
              <div className="hq-feature-grid">
                <div className="hq-card">
                  <div className="hq-card-icon">🐉</div>
                  <h4>Evolving Pet: Pyra</h4>
                  <p>Evolves from Baby → Junior → Master as your daily coding streak grows.</p>
                  <div className="pet-streak-tag">🔥 7-Day Active Streak</div>
                </div>

                <div className="hq-card">
                  <div className="hq-card-icon">🏰</div>
                  <h4>Developer HQ Buildings</h4>
                  <p>Unlock Variables Lab, Loop Citadel & AI Labs to collect passive daily coins.</p>
                  <div className="building-passive-tag">🪙 +450 Daily Passive Income</div>
                </div>

                <div className="hq-card">
                  <div className="hq-card-icon">🏆</div>
                  <h4>100% Verified Portfolio</h4>
                  <p>Every completed challenge is recorded on PostgreSQL to prove your real coding mastery.</p>
                  <div className="portfolio-tag">🎓 Real Production Skills</div>
                </div>
              </div>

              <div className="hq-cta-row">
                <button onClick={onStartFree} className="btn-claim-reward">
                  Build Your Developer HQ Free →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
