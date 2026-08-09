import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { realmsData } from '../../data/realmsData';
import type { MapNode } from '../../types/game';
import { NodeDetailModal } from './NodeDetailModal';
import { soundManager } from '../../utils/audio';
import {
  GiSparkles as Sparkles,
  GiAnvil as Code2,
  GiLightningTrio as Zap,
  GiShield as ShieldCheck,
  GiWorms as Bug,
  GiBrain as HelpCircle,
  GiDragonHead as Flame,
  GiPadlock as Lock,
  GiStarMedal as Star,
  GiCheckMark as Check,
  GiSpeaker as Volume2,
  GiSpeakerOff as VolumeX
} from 'react-icons/gi';

export const WorldMap: React.FC = () => {
  const { profile, setActiveNode, setActiveTab } = useGame();
  const [selectedRealmId, setSelectedRealmId] = useState<string>('starter-village');
  const [popoverNode, setPopoverNode] = useState<MapNode | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundManager.enabled);

  const activeRealm = realmsData.find(r => r.id === selectedRealmId) || realmsData[0];

  const toggleSound = () => {
    soundManager.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) soundManager.playClick();
  };

  const handleRealmSelect = (id: string) => {
    soundManager.playClick();
    setSelectedRealmId(id);
  };

  const getNodeIcon = (iconName: string, type: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles size={18} />;
      case 'Code2': return <Code2 size={18} />;
      case 'Zap': return <Zap size={18} />;
      case 'ShieldCheck': return <ShieldCheck size={18} />;
      case 'Bug': return <Bug size={18} />;
      case 'HelpCircle': return <HelpCircle size={18} />;
      case 'Flame': return <Flame size={22} color="var(--accent-red)" />;
      default:
        if (type === 'boss') return <Flame size={22} />;
        return <Code2 size={18} />;
    }
  };

  const handleNodeClick = (node: MapNode) => {
    if (!node.unlocked) return;
    soundManager.playClick();
    setPopoverNode(node);
  };

  const handleStartNode = (node: MapNode) => {
    soundManager.playSuccess();
    setActiveNode(node);
    setPopoverNode(null);
    if (node.type === 'boss') {
      setActiveTab('boss');
    } else {
      setActiveTab('challenge');
    }
  };

  // Generate smooth cubic bezier curve SVG paths between nodes
  const renderBezierPaths = () => {
    const nodes = activeRealm.nodes;
    return nodes.map((node, index) => {
      if (index === 0) return null;
      const prev = nodes[index - 1];

      const x1 = (prev.x / 100) * 1000;
      const y1 = (prev.y / 100) * 2000;
      const x2 = (node.x / 100) * 1000;
      const y2 = (node.y / 100) * 2000;

      const deltaY = (y2 - y1) * 0.5;
      const pathD = `M ${x1} ${y1} C ${x1} ${y1 + deltaY}, ${x2} ${y2 - deltaY}, ${x2} ${y2}`;

      return (
        <g key={`curve-${prev.id}-${node.id}`}>
          <path
            d={pathD}
            fill="none"
            stroke="var(--bg-dark)"
            strokeWidth="6"
          />
          <path
            d={pathD}
            fill="none"
            stroke={node.unlocked ? 'var(--text-main)' : 'var(--border-dark)'}
            strokeWidth="3"
            strokeDasharray={node.unlocked ? '6 6' : '4 4'}
            style={{ transition: 'all 0.3s ease' }}
          />
        </g>
      );
    });
  };

  return (
    <div style={{
      width: '100%',
      minHeight: 'calc(100vh - 68px)',
      background: 'var(--bg-dark)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      paddingBottom: '40px'
    }}>
      {/* Realm Selection Filter Bar */}
      <div style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-dark)',
        background: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
          {realmsData.map((realm) => {
            const isSelected = realm.id === selectedRealmId;
            const completedCount = realm.nodes.filter(n => n.completed).length;
            return (
              <button
                key={realm.id}
                onClick={() => handleRealmSelect(realm.id)}
                style={{
                  background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--border-bright)' : 'var(--border-dark)',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  opacity: realm.unlocked ? 1 : 0.5,
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontSize: '20px' }}>{realm.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '13px' }}>
                    {realm.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>
                    {completedCount} / {realm.nodes.length} Cleared
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Audio Effects Toggle */}
        <button
          onClick={toggleSound}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{soundEnabled ? 'SOUND: ON' : 'SOUND: OFF'}</span>
        </button>
      </div>

      {/* Main Gamified RPG Map Canvas */}
      <div style={{
        flex: 1,
        margin: 'var(--space-6)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        position: 'relative',
        minHeight: '1800px',
        overflow: 'hidden'
      }}>
        {/* Realm Header Info Badge */}
        <div style={{
          position: 'sticky',
          top: 'var(--space-6)',
          left: 'var(--space-6)',
          zIndex: 10,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-bright)',
          padding: 'var(--space-4) var(--space-5)',
          borderRadius: 'var(--radius-md)',
          maxWidth: '380px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '24px' }}>{activeRealm.icon}</span>
            <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-main)' }}>
              {activeRealm.name}
            </h2>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.04em' }}>
            {activeRealm.tagline}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
            {activeRealm.description}
          </p>

          {/* Gamified Realm Progress Meter */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-dark)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '4px' }}>
              <span>REALM PROGRESS ({activeRealm.nodes.length} NODES)</span>
              <span>{Math.round((activeRealm.nodes.filter(n => n.completed).length / activeRealm.nodes.length) * 100)}%</span>
            </div>
            <div style={{ background: 'var(--bg-dark)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                background: 'var(--text-main)',
                height: '100%',
                width: `${(activeRealm.nodes.filter(n => n.completed).length / activeRealm.nodes.length) * 100}%`,
                borderRadius: '2px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Interactive RPG Node DAG Graph */}
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          minHeight: '1800px'
        }}>
          {/* SVG Bezier Connection Layer */}
          <svg
            viewBox="0 0 1000 2000"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            {renderBezierPaths()}
          </svg>

          {/* Node Waypoint Renderers */}
          {activeRealm.nodes.map((node) => {
            const isCurrentActive = profile.level >= 1 && node.id === 'node-starter-3';
            const isCompleted = node.completed;

            return (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node)}
                style={{
                  position: 'absolute',
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20,
                  cursor: node.unlocked ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                {/* Active Player Pin */}
                {isCurrentActive && (
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    background: 'var(--text-main)',
                    color: 'var(--bg-dark)',
                    fontWeight: 800,
                    fontSize: '10px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    boxShadow: 'var(--shadow-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <span>▶ YOU ARE HERE</span>
                  </div>
                )}

                {/* Node Button Circle */}
                <div style={{
                  width: node.type === 'boss' ? '60px' : '48px',
                  height: node.type === 'boss' ? '60px' : '48px',
                  borderRadius: '50%',
                  background: !node.unlocked
                    ? 'var(--bg-dark)'
                    : isCompleted
                    ? 'var(--text-main)'
                    : 'var(--bg-elevated)',
                  border: '2px solid',
                  borderColor: !node.unlocked
                    ? 'var(--border-dark)'
                    : 'var(--border-bright)',
                  color: !node.unlocked
                    ? 'var(--text-dim)'
                    : isCompleted
                    ? 'var(--bg-dark)'
                    : 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: node.unlocked ? 'var(--shadow-gold)' : 'none',
                  transition: 'all 0.2s ease'
                }}>
                  {!node.unlocked ? (
                    <Lock size={18} color="var(--text-dim)" />
                  ) : isCompleted ? (
                    <Check size={22} strokeWidth={3} />
                  ) : (
                    getNodeIcon(node.iconName, node.type)
                  )}
                </div>

                {/* Node Title & Stars */}
                <div style={{
                  marginTop: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-dark)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
                    {node.title}
                  </div>
                  {node.unlocked && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' }}>
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          size={10}
                          fill={s <= node.stars ? 'var(--text-main)' : 'none'}
                          color={s <= node.stars ? 'var(--text-main)' : 'var(--text-dim)'}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node Detail Modal */}
      {popoverNode && (
        <NodeDetailModal
          node={popoverNode}
          onClose={() => setPopoverNode(null)}
          onLaunch={() => handleStartNode(popoverNode)}
        />
      )}
    </div>
  );
};
