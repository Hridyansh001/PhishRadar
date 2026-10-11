interface RiskMeterProps {
  score: number;
  verdict: 'SAFE' | 'REVIEW' | 'SUSPICIOUS';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  size?: number;
}

export function RiskMeter({ score, verdict, riskLevel, size = 180 }: RiskMeterProps) {
  // Clamped score
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  // SVG parameters
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use a 270 degree arc for gauge look
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  let color = 'var(--safe-green)';
  let glowColor = 'var(--safe-glow)';
  let verdictLabel = 'SAFE';

  if (verdict === 'SUSPICIOUS' || safeScore >= 60) {
    color = 'var(--danger-crimson)';
    glowColor = 'var(--danger-glow)';
    verdictLabel = 'DANGER';
  } else if (verdict === 'REVIEW' || safeScore >= 30) {
    color = 'var(--warning-amber)';
    glowColor = 'var(--warning-glow)';
    verdictLabel = 'REVIEW';
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
          style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(${glowColor})` }}
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
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
            fontSize: '2.5rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: color,
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}>
            {safeScore}
          </span>
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginTop: '4px',
          }}>
            Risk Score
          </span>
        </div>
      </div>

      {/* Level Tag */}
      <div style={{
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span className={`badge ${
          verdict === 'SUSPICIOUS' ? 'badge-danger' :
          verdict === 'REVIEW' ? 'badge-review' : 'badge-safe'
        }`}>
          {verdictLabel} &bull; {riskLevel} RISK
        </span>
      </div>
    </div>
  );
}
