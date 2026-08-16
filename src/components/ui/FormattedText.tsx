import React from 'react';
import { Sparkles, BookOpen } from 'lucide-react';

interface Props {
  text: string;
  style?: React.CSSProperties;
}

export const FormattedText: React.FC<Props> = ({ text, style }) => {
  if (!text) return null;

  const parseInlineFormatting = (str: string) => {
    const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={idx} style={{ color: 'var(--text-main)', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={idx}
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--accent-gold)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9em',
              border: '1px solid var(--border-subtle)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length >= 3) {
        return (
          <code
            key={idx}
            style={{
              background: 'rgba(217, 160, 54, 0.15)',
              color: 'var(--accent-gold)',
              padding: '2px 7px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.9em',
              border: '1px solid rgba(217, 160, 54, 0.3)',
              display: 'inline-block',
              margin: '0 2px'
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const blocks = text.split(/\n\n+/);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Code block (``` ... ```)
        if (trimmed.startsWith('```')) {
          const lines = trimmed.slice(3, trimmed.endsWith('```') ? -3 : undefined).trim().split('\n');
          const firstLine = lines[0].trim();
          const isLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const codeContent = isLang ? lines.slice(1).join('\n') : lines.join('\n');
          return (
            <pre
              key={bIdx}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-bright)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-main)',
                overflowX: 'auto',
                margin: '6px 0',
                lineHeight: 1.5
              }}
            >
              <code>{codeContent}</code>
            </pre>
          );
        }

        // Headings (# Heading)
        if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
          const headingText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4
              key={bIdx}
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--accent-gold)',
                marginTop: bIdx === 0 ? '0' : '10px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} style={{ color: 'var(--accent-gold)' }} />
              {parseInlineFormatting(headingText)}
            </h4>
          );
        }

        // Standalone bold title line (**Title**)
        if (/^\*\*[^*]+\*\*$/.test(trimmed) || /^\*\*[^*]+:\s*[^*]+\*\*$/.test(trimmed)) {
          const headingText = trimmed.replace(/^\*\*|\*\*$/g, '');
          return (
            <h4
              key={bIdx}
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--accent-gold)',
                marginTop: bIdx === 0 ? '0' : '10px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <BookOpen size={14} />
              {parseInlineFormatting(headingText)}
            </h4>
          );
        }

        // Lines inside paragraph or list
        const lines = trimmed.split('\n');

        return (
          <div key={bIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {lines.map((line, lIdx) => {
              const lTrim = line.trim();
              if (!lTrim) return null;

              // Bullet item (* item or - item or *   item)
              if (/^[*|-]\s+/.test(lTrim)) {
                const itemContent = lTrim.replace(/^[*|-]\s+/, '');
                return (
                  <div
                    key={lIdx}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start',
                      marginLeft: '4px',
                      lineHeight: 1.6
                    }}
                  >
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 800, marginTop: '2px' }}>•</span>
                    <div style={{ flex: 1 }}>{parseInlineFormatting(itemContent)}</div>
                  </div>
                );
              }

              // Normal text line
              return (
                <div key={lIdx} style={{ lineHeight: 1.6, color: 'var(--text-main)' }}>
                  {parseInlineFormatting(line)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
