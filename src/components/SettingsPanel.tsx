import React from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gridColumns: number;
  onChangeGridColumns: (cols: number) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  gridColumns,
  onChangeGridColumns
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '100%',
      maxWidth: '400px',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      boxShadow: '-4px 0 15px rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--text-primary)',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>⚙ 表示設定</h3>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '1.5rem',
          cursor: 'pointer'
        }}>×</button>
      </div>

      {/* Grid columns setting */}
      <div style={{ padding: '1.5rem', flex: 1 }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>グリッド列数</h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[4, 6, 8, 10].map(cols => (
            <button
              key={cols}
              onClick={() => onChangeGridColumns(cols)}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: gridColumns === cols ? 'var(--accent)' : 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {cols}列
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
