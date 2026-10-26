interface RiskMeterProps {
  score: number;
  verdict?: string;
  riskLevel?: string;
  size?: number;
}

export function RiskMeter({ score, verdict = 'SAFE', riskLevel, size = 160 }: RiskMeterProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  let color = '#15803d'; // Forest green on white
  let verdictLabel = 'SAFE';
  let computedLevel = riskLevel || 'LOW';

  const vUpper = (verdict || '').toUpperCase();

  if (vUpper === 'SUSPICIOUS' || vUpper === 'MALICIOUS' || safeScore > 60) {
    color = '#b91c1c'; // Deep crimson
    verdictLabel = 'THREAT';
    computedLevel = riskLevel || 'HIGH';
  } else if (vUpper === 'REVIEW' || safeScore >= 20) {
    color = '#b45309'; // Amber
    verdictLabel = 'REVIEW';
    computedLevel = riskLevel || 'MEDIUM';
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f0f0f0"
            strokeWidth={strokeWidth}
          />
          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
            }}
          />
        </svg>

        {/* Center Readout */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: size >= 180 ? '2.8rem' : '2.2rem',
            fontWeight: 700,
            color: '#111827',
            fontFamily: "'Times New Roman', Times, serif",
            lineHeight: 1,
          }}>
            {safeScore}
          </span>
          <span style={{
            fontSize: '0.72rem',
            color: '#6b7280',
            fontWeight: 600,
            letterSpacing: '0.04em',
            marginTop: '3px',
            fontFamily: "'Times New Roman', Times, serif",
          }}>
            out of 100
          </span>
        </div>
      </div>

      {/* Level Tag (No emojis) */}
      <div style={{
        marginTop: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 12px',
        borderRadius: '9999px',
        backgroundColor: '#ffffff',
        border: `1px solid ${color}50`,
        fontSize: '0.75rem',
        fontWeight: 700,
        color: color,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontFamily: "'Times New Roman', Times, serif",
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
        <span>{verdictLabel} • {computedLevel} RISK</span>
      </div>
    </div>
  );
}
