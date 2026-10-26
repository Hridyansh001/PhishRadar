import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'cyan' | 'green' | 'amber' | 'red' | 'neutral';
  badge?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'neutral',
  badge,
  onClick,
  isActive = false,
}: StatCardProps) {
  const getTheme = () => {
    switch (color) {
      case 'green':
        return {
          border: isActive ? '#15803d' : '#e5e7eb',
          activeBg: '#f0fdf4',
          text: '#15803d',
          iconBg: '#f0fdf4',
          iconColor: '#15803d',
          badgeBg: '#dcfce7',
          badgeText: '#15803d',
        };
      case 'amber':
        return {
          border: isActive ? '#b45309' : '#e5e7eb',
          activeBg: '#fffbeb',
          text: '#b45309',
          iconBg: '#fffbeb',
          iconColor: '#b45309',
          badgeBg: '#fef3c7',
          badgeText: '#92400e',
        };
      case 'red':
        return {
          border: isActive ? '#b91c1c' : '#e5e7eb',
          activeBg: '#fef2f2',
          text: '#b91c1c',
          iconBg: '#fef2f2',
          iconColor: '#b91c1c',
          badgeBg: '#fee2e2',
          badgeText: '#991b1b',
        };
      case 'cyan':
      case 'neutral':
      default:
        return {
          border: isActive ? '#111827' : '#e5e7eb',
          activeBg: '#f9fafb',
          text: '#111827',
          iconBg: '#f3f4f6',
          iconColor: '#111827',
          badgeBg: '#f3f4f6',
          badgeText: '#4b5563',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className="glass-panel"
      style={{
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        backgroundColor: isActive ? theme.activeBg : '#ffffff',
        borderColor: theme.border,
        borderWidth: isActive ? '2px' : '1px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        boxShadow: isActive
          ? '0 4px 12px rgba(0, 0, 0, 0.06)'
          : '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 600 }}>
            {title}
          </span>
          {badge && (
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: theme.badgeBg,
              color: theme.badgeText,
            }}>
              {badge}
            </span>
          )}
        </div>

        <div style={{
          fontSize: '2.1rem',
          fontWeight: 800,
          color: theme.text,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
        }}>
          {value}
        </div>

        {subtitle && (
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '6px' }}>
            {subtitle}
          </div>
        )}
      </div>

      {icon && (
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '8px',
          backgroundColor: theme.iconBg,
          color: theme.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
    </div>
  );
}
