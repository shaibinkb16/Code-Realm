import React, { useRef } from 'react';

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'realm' | 'boss' | 'village';
  active?: boolean;
}

const NODES: Node[] = [
  { id: '1', name: 'Starter Village', x: 22, y: 78, type: 'village', active: true },
  { id: '2', name: 'Algo Arena', x: 40, y: 55, type: 'realm' },
  { id: '3', name: 'Data Citadel', x: 65, y: 40, type: 'realm' },
  { id: '4', name: 'AI Nexus', x: 80, y: 22, type: 'boss' },
  { id: '5', name: 'System Core', x: 48, y: 25, type: 'realm' }
];

const CONNECTIONS = [
  ['1', '2'],
  ['2', '3'],
  ['3', '4'],
  ['2', '5'],
  ['5', '4']
];

export const RealmVisualization: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#05070e] overflow-hidden select-none flex flex-col justify-between p-8 md:p-12 border-r border-white/5">
      {/* Background Starfield & Subtle Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.08)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Header Badge */}
      <div className="relative z-10 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono font-bold text-lg shadow-sm">
          ⚔️
        </div>
        <div>
          <span className="text-xs font-mono font-semibold tracking-widest text-indigo-400/80 uppercase">World Entrance</span>
          <h1 className="text-lg font-bold text-white tracking-tight">CODE REALM</h1>
        </div>
      </div>

      {/* SVG Interactive Realm Map Constellation */}
      <div className="relative z-10 w-full my-auto aspect-[4/3] max-w-xl mx-auto">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
          {/* Animated Connecting Beams */}
          {CONNECTIONS.map(([fromId, toId], idx) => {
            const from = NODES.find(n => n.id === fromId)!;
            const to = NODES.find(n => n.id === toId)!;
            return (
              <g key={`conn-${idx}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="rgba(99,102,241,0.15)"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="rgba(129,140,248,0.4)"
                  strokeWidth="0.6"
                  className="animate-pulse"
                />
              </g>
            );
          })}

          {/* Living Realm Nodes */}
          {NODES.map((node) => {
            const isStarter = node.type === 'village';
            const isBoss = node.type === 'boss';

            return (
              <g key={node.id} className="cursor-pointer group">
                {/* Outer Glow Halo */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isStarter ? '4' : '3'}
                  fill={isStarter ? 'rgba(99,102,241,0.2)' : isBoss ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}
                  className="animate-ping"
                  style={{ animationDuration: isStarter ? '3s' : '5s' }}
                />

                {/* Node Shape */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isStarter ? '2.5' : '1.8'}
                  fill={isStarter ? '#6366f1' : isBoss ? '#ef4444' : '#334155'}
                  stroke={isStarter ? '#a5b4fc' : isBoss ? '#fca5a5' : '#64748b'}
                  strokeWidth="0.5"
                  className="transition-transform duration-300 group-hover:scale-125"
                />

                {/* Node Title Label */}
                <text
                  x={node.x}
                  y={node.y + 5}
                  textAnchor="middle"
                  fill={isStarter ? '#cbd5e1' : '#64748b'}
                  fontSize="2.8"
                  fontFamily="sans-serif"
                  fontWeight={isStarter ? '600' : '400'}
                  className="transition-colors duration-300 group-hover:fill-white"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Tagline */}
      <div className="relative z-10 border-t border-white/5 pt-4 flex items-center justify-between text-xs text-slate-500 font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>REALM GATE ONLINE</span>
        </div>
        <span>v3.6-FLASH • ADAPTIVE RPG</span>
      </div>
    </div>
  );
};
