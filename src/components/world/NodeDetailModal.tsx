import React, { useState } from 'react';
import type { MapNode } from '../../types/game';
import { useGame } from '../../context/GameContext';
import {
  GiCancel as X,
  GiStarMedal as Star,
  GiLightningTrio as Zap,
  GiDragonHead as Flame,
  GiPlayButton as Play,
  GiCheckMark as CheckCircle,
  GiFastForwardButton as ChevronRight,
  GiPadlock as Lock
} from 'react-icons/gi';

interface Props {
  node: MapNode;
  onClose: () => void;
  onLaunch: (questionIdx?: number) => void;
}

export const NodeDetailModal: React.FC<Props> = ({ node, onClose, onLaunch }) => {
  const { profile } = useGame();
  const [activeRangeIdx, setActiveRangeIdx] = useState<number>(0);

  const currentStars = profile.nodeStars[node.id] || 0;
  const subLevels = node.subLevels || [];

  const completedCount = subLevels.filter(s => profile.completedNodeIds.includes(s.id)).length;
  const totalSubLevels = subLevels.length || 100;
  const progressPercent = Math.round((completedCount / totalSubLevels) * 100);

  const ranges = [
    { label: '1 - 25', start: 0, end: 25 },
    { label: '26 - 50', start: 25, end: 50 },
    { label: '51 - 75', start: 50, end: 75 },
    { label: '76 - 100', start: 75, end: 100 }
  ];

  const currentRange = ranges[activeRangeIdx];
  const visibleSubLevels = subLevels.slice(currentRange.start, currentRange.end);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
      zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)'
    }}>
      <div className="realm-card" style={{
        width: '560px', maxWidth: '100%', maxHeight: '90vh',
        padding: 0, display: 'flex', flexDirection: 'column',
        border: node.type === 'boss' ? '1px solid var(--error)' : '1px solid var(--border-bright)'
      }}>
        {/* Header Banner */}
        <div className="flex-between" style={{ padding: 'var(--space-4) var(--space-5)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', padding: '2px 8px', borderRadius: 'var(--radius-sm)',
              background: node.type === 'boss' ? 'var(--error)' : 'var(--text-main)', color: 'var(--bg-dark)',
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-2)'
            }}>
              {node.type === 'boss' ? <Flame size={14} /> : <Zap size={14} />}
              <span>100-Level Waypoint • {completedCount} / {totalSubLevels} Cleared</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
              {node.title}
            </h2>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {completedCount >= 75 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(217, 160, 54, 0.2), rgba(52, 211, 153, 0.2))',
              border: '1px solid var(--accent-gold)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  🎉 NEXT MAP WAYPOINT UNLOCKED!
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-main)', marginTop: '2px' }}>
                  You cleared {completedCount}/100 questions — meeting the 75+ questions threshold to advance!
                </div>
              </div>
              <span style={{ fontSize: '24px' }}>🎊</span>
            </div>
          )}

          {/* Progress Bar & Rating */}
          <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Node Mastery Progress ({progressPercent}%)
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                {[1, 2, 3].map((starNum) => (
                  <Star
                    key={starNum}
                    size={18}
                    fill={starNum <= currentStars ? 'var(--accent-gold)' : 'none'}
                    color={starNum <= currentStars ? 'var(--accent-gold)' : 'var(--text-dim)'}
                  />
                ))}
              </div>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #34d399)', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Sub-Levels Range Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {ranges.map((r, idx) => (
              <button
                key={r.label}
                onClick={() => setActiveRangeIdx(idx)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: activeRangeIdx === idx ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                  background: activeRangeIdx === idx ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
                  color: activeRangeIdx === idx ? 'var(--accent-gold)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Questions {r.label}
              </button>
            ))}
          </div>

          {/* Sub-Levels List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
            {visibleSubLevels.map((sub, idx) => {
              const globalIdx = currentRange.start + idx;
              const isCompleted = profile.completedNodeIds.includes(sub.id);
              const isUnlocked = globalIdx === 0 || isCompleted || profile.completedNodeIds.includes(subLevels[globalIdx - 1]?.id);

              return (
                <div key={sub.id} className="flex-between" style={{
                  background: isCompleted ? 'rgba(52, 211, 153, 0.08)' : isUnlocked ? 'var(--bg-elevated)' : 'rgba(0,0,0,0.3)',
                  border: isCompleted ? '1px solid rgba(52, 211, 153, 0.3)' : isUnlocked ? '1px solid var(--border-subtle)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 'var(--radius-md)', padding: '10px 14px', opacity: isUnlocked ? 1 : 0.6
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '50%',
                      background: isCompleted ? '#34d399' : isUnlocked ? 'var(--accent-gold)' : 'var(--bg-dark)',
                      color: isCompleted || isUnlocked ? 'var(--bg-dark)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '11px'
                    }}>
                      {isCompleted ? <CheckCircle size={14} color="#000" /> : isUnlocked ? globalIdx + 1 : <Lock size={12} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: isUnlocked ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {sub.title}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                        <span style={{ color: 'var(--accent-teal-bright)' }}>+{sub.xp} XP</span>
                        <span>•</span>
                        <span style={{ color: 'var(--accent-gold)' }}>+{sub.coins} Coins</span>
                      </div>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <button onClick={() => onLaunch(globalIdx + 1)} className="btn-primary" style={{ padding: '5px 12px', fontSize: '12px' }}>
                      <span>Play Question</span><ChevronRight size={14} />
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} /> Complete Q{globalIdx} to unlock
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
              Back to Map
            </button>
            <button onClick={onLaunch} className="btn-primary" style={{ flex: 2, justifyContent: 'center', background: node.type === 'boss' ? 'var(--error)' : 'var(--accent-primary)', borderColor: node.type === 'boss' ? 'var(--error)' : 'var(--accent-primary)' }}>
              <Play size={16} fill="currentColor" />
              <span>{node.type === 'boss' ? 'Fight Boss' : 'Enter Workstation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
