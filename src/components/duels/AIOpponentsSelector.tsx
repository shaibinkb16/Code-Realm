import React from 'react';
import { Bot, Swords } from 'lucide-react';

export interface AIBot {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  specialty: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  winRate: string;
}

export const aiBots: AIBot[] = [
  { id: 'bot-rookie', name: '🤖 Rookie Bot', avatar: '🤖', rating: 500, specialty: 'Basic Syntax & Print Statements', difficulty: 'Easy', winRate: '35%' },
  { id: 'bot-logic', name: '🤖 Logic Bot', avatar: '🤖', rating: 750, specialty: 'Boolean Logic & Branching', difficulty: 'Medium', winRate: '52%' },
  { id: 'bot-speed', name: '🤖 Speed Bot', avatar: '⚡', rating: 890, specialty: 'Rapid Array Manipulations', difficulty: 'Medium', winRate: '68%' },
  { id: 'bot-debug', name: '🤖 Debug Bot', avatar: '🐛', rating: 920, specialty: 'Finding Hidden Memory Leaks', difficulty: 'Hard', winRate: '75%' },
  { id: 'bot-algo', name: '🤖 Algorithm Bot', avatar: '🧠', rating: 980, specialty: 'Dynamic Programming & Trees', difficulty: 'Hard', winRate: '82%' },
  { id: 'bot-architect', name: '🤖 Architect Bot', avatar: '🏛️', rating: 1200, specialty: 'High-Throughput Concurrency', difficulty: 'Extreme', winRate: '91%' }
];

export const AIOpponentsSelector: React.FC<{ onSelectBot: (bot: AIBot) => void }> = ({ onSelectBot }) => {
  return (
    <div style={{ width: '100%', maxWidth: '1100px', marginTop: '24px' }}>
      <h3 style={{ fontSize: '18px', color: 'var(--accent-gold)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Bot size={20} /> SELECT AI OPPONENT FOR DUEL
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {aiBots.map((bot) => (
          <div key={bot.id} className="realm-card" style={{ padding: '18px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ fontSize: '32px' }}>{bot.avatar}</div>
              <div>
                <h4 style={{ fontSize: '16px', color: 'var(--text-main)' }}>{bot.name}</h4>
                <div style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 700 }}>
                  Rating: {bot.rating} ELO • Win Rate: {bot.winRate}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Specialty: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{bot.specialty}</span>
            </p>

            <button
              onClick={() => onSelectBot(bot)}
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}
            >
              <Swords size={16} /> CHALLENGE BOT
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
