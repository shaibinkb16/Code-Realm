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
  GiStack as Layers
} from 'react-icons/gi';

interface Props {
  node: MapNode;
  onClose: () => void;
  onLaunch: () => void;
}

export const NodeDetailModal: React.FC<Props> = ({ node, onClose, onLaunch }) => {
  const { profile } = useGame();

  const currentStars = profile.nodeStars[node.id] || 0;
  const subLevels = node.subLevels || [];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
      zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-5)'
    }}>
      <div className="realm-card" style={{
        width: '480px', maxWidth: '100%', maxHeight: '90vh',
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
              <span>{node.type} Waypoint • {subLevels.length > 0 ? `${subLevels.length} Sub-Levels` : '1 Trial'}</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
              {node.title}
            </h2>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 'var(--space-6)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Star History */}
          <div className="flex-between" style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}>
              Waypoint Rating
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {[1, 2, 3].map((starNum) => (
                <Star
                  key={starNum}
                  size={20}
                  fill={starNum <= currentStars ? 'var(--text-main)' : 'none'}
                  color={starNum <= currentStars ? 'var(--text-main)' : 'var(--text-dim)'}
                />
              ))}
            </div>
          </div>

          {/* Sub-Levels List */}
          {subLevels.length > 0 && (
            <div>
              <div style={{
                fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)'
              }}>
                <Layers size={14} /> Sub-Level Trials ({subLevels.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {subLevels.map((sub, idx) => (
                  <div key={sub.id} className="flex-between" style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: sub.completed ? 'var(--text-main)' : 'var(--bg-dark)',
                        color: sub.completed ? 'var(--bg-dark)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '11px'
                      }}>
                        {sub.completed ? <CheckCircle size={14} /> : idx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{sub.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: 'var(--space-2)', marginTop: '2px' }}>
                          <span>+{sub.xp} XP</span><span>•</span><span>+{sub.coins} Coins</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={onLaunch} className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                      <span>Play</span><ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single Launch Action */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
              Back to Map
            </button>
            <button onClick={onLaunch} className="btn-primary" style={{ flex: 2, justifyContent: 'center', background: node.type === 'boss' ? 'var(--error)' : 'var(--accent-primary)', borderColor: node.type === 'boss' ? 'var(--error)' : 'var(--accent-primary)' }}>
              <Play size={16} fill="currentColor" />
              <span>{node.type === 'boss' ? 'Fight Boss' : 'Start Trials'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
