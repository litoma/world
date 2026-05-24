import React, { useState } from 'react';
import { SYMBOLS, CATEGORY_LABELS, Category } from '../symbols';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  enabledSymbols: string[];
  onChangeEnabledSymbols: (symbols: string[]) => void;
  gridColumns: number;
  onChangeGridColumns: (cols: number) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  enabledSymbols,
  onChangeEnabledSymbols,
  gridColumns,
  onChangeGridColumns
}) => {
  const [activeCategory, setActiveCategory] = useState<Category>('fx');

  if (!isOpen) return null;

  const handleToggleSymbol = (symbolId: string) => {
    if (enabledSymbols.includes(symbolId)) {
      // Don't allow disabling all symbols (keep at least one)
      if (enabledSymbols.length > 1) {
        onChangeEnabledSymbols(enabledSymbols.filter(id => id !== symbolId));
      }
    } else {
      onChangeEnabledSymbols([...enabledSymbols, symbolId]);
    }
  };

  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  const symbolsInCategory = SYMBOLS.filter(s => s.category === activeCategory);

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
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>グリッド列数</h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[2, 3, 4, 5, 6].map(cols => (
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

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px',
        padding: '1rem 1rem 0 1rem',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'rgba(0,0,0,0.1)'
      }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '0.5rem 0.75rem',
              background: activeCategory === cat ? 'var(--bg-card)' : 'transparent',
              border: 'none',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
              color: activeCategory === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: activeCategory === cat ? 600 : 400
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Symbol Checklist */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {symbolsInCategory.map(symbol => {
            const isChecked = enabledSymbols.includes(symbol.id);
            return (
              <label
                key={symbol.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  backgroundColor: isChecked ? 'rgba(41, 98, 255, 0.05)' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleSymbol(symbol.id)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500 }}>{symbol.label}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {symbol.yahooSymbol || symbol.finnhubSymbol}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
