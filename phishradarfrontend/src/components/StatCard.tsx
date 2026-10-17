import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'cyan' | 'green' | 'amber' | 'red';
}

export function StatCard({ title, value, subtitle, icon, color = 'cyan' }: StatCardProps) {
  const getTheme = () => {
    switch (color) {
      case 'green':
        return {
          glow: 'var(--safe-glow)',
          border: 'rgba(16, 185, 129, 0.25)',
          text: '#34d399',
          iconBg: 'rgba(16, 185, 129, 0.15)',
        };
      case 'amber':
        return {
          glow: 'var(--warning-glow)',
          border: 'rgba(245, 158, 11, 0.25)',
          text: '#fbbf24',
          iconBg: 'rgba(245, 158, 11, 0.15)',
        };
      case 'red':
        return {
          glow: 'var(--danger-glow)',
          border: 'rgba(239, 68, 68, 0.25)',
          text: '#f87171',
          iconBg: 'rgba(239, 68, 68, 0.15)',
        };
      case 'cyan':
      default:
        return {
          glow: 'var(--brand-glow)',
          border: 'rgba(0, 242, 254, 0.25)',
          text: 'var(--radar-cyan)',
          iconBg: 'rgba(0, 242, 254, 0.15)',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        borderColor: theme.border,
      }}
    >
      <div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {title}
        </div>
        <div style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: theme.text,
          lineHeight: 1.2,
          marginTop: '4px',
        }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {subtitle}
          </div>
        )}
      </div>

      {icon && (
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: theme.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
      )}
    </div>
  );
}
