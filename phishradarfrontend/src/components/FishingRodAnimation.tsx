import { useEffect, useRef, useState } from 'react';

interface FishingRodAnimationProps {
  formRef: React.RefObject<HTMLDivElement | null>;
}

export function FishingRodAnimation({ formRef }: FishingRodAnimationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Dynamic animation state
  const [animState, setAnimState] = useState({
    // Rod geometry
    rodTipX: 240,
    rodTipY: 210,
    rodBendX: 130,
    rodBendY: 330,
    rodBaseX: 0,
    rodBaseY: 480,
    // Hook geometry
    hookX: 250,
    hookY: 360,
    hookAngle: 0, // degrees
    // Line curve control point
    lineCtrlX: 245,
    lineCtrlY: 290,
  });

  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    if (isReducedMotion) return;

    let startTime: number | null = null;
    const CYCLE_DURATION = 9200; // 9.2s full cycle for smooth, deliberate cybersecurity pacing

    // Easing functions
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
    const easeInQuad = (t: number) => t * t;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % CYCLE_DURATION;
      const progress = elapsed / CYCLE_DURATION; // 0 to 1

      // Container & Form geometry
      const container = containerRef.current;
      const formEl = formRef.current;

      let targetX = 540;
      let targetY = 320;
      let containerW = 900;
      let containerH = 600;

      if (container) {
        const cRect = container.getBoundingClientRect();
        containerW = cRect.width;
        containerH = cRect.height;

        if (formEl) {
          const fRect = formEl.getBoundingClientRect();
          // Target is strictly in front of the form's left edge (with safe margin)
          // Aim near the top/middle of the form (around email/password area)
          const relFormLeft = fRect.left - cRect.left;
          const relFormTop = fRect.top - cRect.top;
          // Hook stops ~35px to the left of the login card, safe from covering inputs
          targetX = Math.max(260, relFormLeft - 36);
          targetY = Math.max(160, Math.min(containerH - 120, relFormTop + Math.min(180, fRect.height * 0.42)));
        } else {
          targetX = Math.max(280, containerW * 0.65);
          targetY = containerH * 0.45;
        }
      }

      // Base coordinates for rod
      const rodBaseX = 0;
      const rodBaseY = Math.min(containerH * 0.82, 540);
      const rodRestTipX = Math.min(containerW * 0.28, 250);
      const rodRestTipY = Math.min(containerH * 0.35, 200);

      // Resting hook coordinates
      const hookRestX = rodRestTipX + 8;
      const hookRestY = rodRestTipY + 140;

      // Animation Phase Breakdown:
      // Phase 1 (0.00 - 0.18): IDLE (subtle dangling)
      // Phase 2 (0.18 - 0.40): CAST (rod whips forward, hook launches)
      // Phase 3 (0.40 - 0.52): APPROACH (hook glides in, decelerates)
      // Phase 4 (0.52 - 0.72): PAUSE / LURE (hook hangs, tantalizingly sways)
      // Phase 5 (0.72 - 0.90): RETRACT (line reeled in, hook pulls back)
      // Phase 6 (0.90 - 1.00): SETTLE (smooth return to idle)

      let currentHookX = hookRestX;
      let currentHookY = hookRestY;
      let currentHookAngle = 0;
      let tipX = rodRestTipX;
      let tipY = rodRestTipY;
      let bendX = rodRestTipX * 0.52;
      let bendY = rodBaseY - (rodBaseY - rodRestTipY) * 0.48;

      if (progress < 0.18) {
        // PHASE 1: IDLE
        const p = progress / 0.18;
        const idleWave = Math.sin(p * Math.PI * 4);
        currentHookX = hookRestX + idleWave * 3;
        currentHookY = hookRestY + Math.cos(p * Math.PI * 4) * 4;
        currentHookAngle = idleWave * 4; // slight pendulum swing
        tipX = rodRestTipX;
        tipY = rodRestTipY + idleWave * 1.5;
      } else if (progress < 0.40) {
        // PHASE 2: CAST
        const p = (progress - 0.18) / 0.22;
        // Rod bends forward under casting impulse
        const rodBendFactor = Math.sin(p * Math.PI);
        tipX = rodRestTipX + rodBendFactor * 32;
        tipY = rodRestTipY + rodBendFactor * 26;
        bendX = rodRestTipX * 0.52 + rodBendFactor * 20;

        // Hook accelerates forward with an arched trajectory
        const ease = easeInOutCubic(p);
        const arcHeight = Math.sin(p * Math.PI) * -65; // parabolic arc upward
        currentHookX = hookRestX + (targetX - hookRestX) * ease;
        currentHookY = hookRestY + (targetY - hookRestY) * ease + arcHeight;
        // Hook tilts back during initial launch, then points forward
        currentHookAngle = Math.sin(p * Math.PI) * -22 + (1 - p) * 10;
      } else if (progress < 0.52) {
        // PHASE 3: APPROACH
        const p = (progress - 0.40) / 0.12;
        const ease = easeOutQuad(p);
        // Rod begins recovering from bend
        const rodSettle = (1 - p);
        tipX = rodRestTipX + rodSettle * 10;
        tipY = rodRestTipY + rodSettle * 8;

        currentHookX = hookRestX + (targetX - hookRestX) * (0.88 + 0.12 * ease);
        currentHookY = hookRestY + (targetY - hookRestY) * (0.88 + 0.12 * ease);
        // Damped swing as it decelerates
        currentHookAngle = Math.sin(p * Math.PI * 3) * 8 * (1 - p);
      } else if (progress < 0.72) {
        // PHASE 4: PAUSE / HOVER NEAR LOGIN FORM
        const p = (progress - 0.52) / 0.20;
        // Subtle enticing dangle / sway right outside the form boundary
        const hoverWave = Math.sin(p * Math.PI * 5);
        currentHookX = targetX + hoverWave * 4;
        currentHookY = targetY + Math.cos(p * Math.PI * 4) * 5;
        currentHookAngle = hoverWave * 6; // gentle rocking
        tipX = rodRestTipX;
        tipY = rodRestTipY;
      } else if (progress < 0.90) {
        // PHASE 5: RETRACT
        const p = (progress - 0.72) / 0.18;
        // Rod bends slightly upward/backward under line tension
        const tension = Math.sin(p * Math.PI);
        tipX = rodRestTipX - tension * 12;
        tipY = rodRestTipY - tension * 18;
        bendX = rodRestTipX * 0.52 - tension * 10;

        // Hook travels back smoothly toward rod
        const ease = easeInQuad(p);
        currentHookX = targetX - (targetX - hookRestX) * ease;
        currentHookY = targetY - (targetY - hookRestY) * ease + Math.sin(p * Math.PI) * -30;
        // Hook angles toward the rod tip during pull
        currentHookAngle = -15 * Math.sin(p * Math.PI);
      } else {
        // PHASE 6: SETTLE
        const p = (progress - 0.90) / 0.10;
        tipX = rodRestTipX;
        tipY = rodRestTipY;
        currentHookX = hookRestX;
        currentHookY = hookRestY + Math.sin(p * Math.PI * 2) * 3 * (1 - p);
        currentHookAngle = Math.sin(p * Math.PI * 3) * 4 * (1 - p);
      }

      // Calculate realistic catenary droop for the fishing line
      const midX = (tipX + currentHookX) / 2;
      const dist = Math.hypot(currentHookX - tipX, currentHookY - tipY);
      // More line sag when closer; tense straight line when extended
      const sagAmount = Math.max(15, Math.min(85, (1 - dist / (containerW * 0.8)) * 60 + 20));
      const midY = Math.max(tipY, currentHookY) + sagAmount;

      setAnimState({
        rodTipX: tipX,
        rodTipY: tipY,
        rodBendX: bendX,
        rodBendY: bendY,
        rodBaseX,
        rodBaseY,
        hookX: currentHookX,
        hookY: currentHookY,
        hookAngle: currentHookAngle,
        lineCtrlX: midX,
        lineCtrlY: midY,
      });

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [formRef, isReducedMotion]);

  // Construct SVG rod path: base -> control bend -> tip
  const { rodBaseX, rodBaseY, rodBendX, rodBendY, rodTipX, rodTipY } = animState;
  const rodPath = `M ${rodBaseX} ${rodBaseY} Q ${rodBendX} ${rodBendY} ${rodTipX} ${rodTipY}`;

  // Fishing line path from rod tip to hook eyelet
  const { hookX, hookY, lineCtrlX, lineCtrlY } = animState;
  const linePath = `M ${rodTipX} ${rodTipY} Q ${lineCtrlX} ${lineCtrlY} ${hookX} ${hookY}`;

  return (
    <div
      ref={containerRef}
      className="phish-animation-wrapper"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <defs>
          {/* Rod Carbon Finish Gradient */}
          <linearGradient id="rodGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#111827" />
            <stop offset="40%" stopColor="#1f2937" />
            <stop offset="75%" stopColor="#374151" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>

          {/* Fishing Line Subtle Glow */}
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14532d" />
            <stop offset="50%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>

          {/* Hook Metallic Gradient */}
          <linearGradient id="hookSteelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="35%" stopColor="#111827" />
            <stop offset="70%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Micro-glow for hook point */}
          <radialGradient id="mintAccentGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. FISHING LINE (Rendered beneath rod & hook) */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="none"
          opacity="0.9"
        />

        {/* Subtle mint sheen along fishing line */}
        <path
          d={linePath}
          fill="none"
          stroke="#86efac"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* 2. FISHING ROD */}
        {/* Rod Shadow / Depth */}
        <path
          d={rodPath}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="6"
          strokeLinecap="round"
          transform="translate(2, 4)"
        />

        {/* Rod Spine (Tapers from base to tip) */}
        <path
          d={rodPath}
          fill="none"
          stroke="url(#rodGradient)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Graphite Highlight on spine */}
        <path
          d={rodPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Rod Guides / Eyelet Rings along rod */}
        {[0.3, 0.55, 0.8, 1.0].map((ratio, index) => {
          // Quadratic interpolation for eyelet placement
          const t = ratio;
          const gx = (1 - t) * (1 - t) * rodBaseX + 2 * (1 - t) * t * rodBendX + t * t * rodTipX;
          const gy = (1 - t) * (1 - t) * rodBaseY + 2 * (1 - t) * t * rodBendY + t * t * rodTipY;

          return (
            <g key={index} transform={`translate(${gx}, ${gy})`}>
              <circle
                r={index === 3 ? 3.5 : 2.5}
                fill="#111827"
                stroke="#9ca3af"
                strokeWidth="1"
              />
              <circle
                r={index === 3 ? 1.8 : 1.2}
                fill="#ffffff"
              />
            </g>
          );
        })}

        {/* Rod Grip / Butt Handle */}
        <g transform={`translate(${rodBaseX}, ${rodBaseY})`}>
          {/* Carbon/Cork Grip */}
          <rect
            x="-6"
            y="-14"
            width="38"
            height="14"
            rx="4"
            transform="rotate(-34)"
            fill="#1f2937"
            stroke="#111827"
            strokeWidth="1.5"
          />
          {/* Subtle Mint Trim Ring on Handle */}
          <line
            x1="8"
            y1="-6"
            x2="10"
            y2="-18"
            stroke="#16a34a"
            strokeWidth="2"
            opacity="0.8"
          />
        </g>

        {/* 3. FISHING HOOK (Transforms with hookX, hookY, and hookAngle) */}
        <g
          transform={`translate(${animState.hookX}, ${animState.hookY}) rotate(${animState.hookAngle})`}
        >
          {/* Hook Subtle Shadow */}
          <ellipse
            cx="0"
            cy="40"
            rx="12"
            ry="4"
            fill="rgba(0,0,0,0.06)"
          />

          {/* Hook Eyelet (Top loop where line ties) */}
          <circle
            cx="0"
            cy="0"
            r="3.5"
            fill="none"
            stroke="#111827"
            strokeWidth="1.8"
          />
          <circle
            cx="0"
            cy="0"
            r="1.6"
            fill="#ffffff"
          />

          {/* Knot / Line Connection Accent */}
          <rect
            x="-2"
            y="-2.5"
            width="4"
            height="3"
            rx="1"
            fill="#15803d"
          />

          {/* Hook Shank (Vertical shaft downwards) */}
          <path
            d="M 0 3 L 0 24"
            stroke="url(#hookSteelGradient)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Hook Bend & Sharp Barb (Smooth J-curve sweeping right/upwards) */}
          {/*
              Path coordinates:
              Starts at bottom of shank (0, 24)
              Bends down and around to (14, 28)
              Curves up to the point at (18, 12)
              Sharp inner barb cut at (14, 17)
          */}
          <path
            d="M 0 22 C 0 34, 15 36, 17 26 C 18 20, 19 14, 19 10 L 16 14 C 15 16, 13 18, 10 20"
            fill="none"
            stroke="url(#hookSteelGradient)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Needle-sharp Hook Point */}
          <path
            d="M 19 10 L 16.5 14.5"
            stroke="#111827"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Subtle Mint-Green Cybersecurity Bait / Lure Accent */}
          <g transform="translate(0, 10)">
            {/* Soft ambient cyber-glow on the hook shaft */}
            <circle
              cx="0"
              cy="2"
              r="7"
              fill="url(#mintAccentGlow)"
            />
            {/* Modern security bait marker */}
            <rect
              x="-1.5"
              y="0"
              width="3"
              height="6"
              rx="1.5"
              fill="#16a34a"
            />
            <rect
              x="-1"
              y="1"
              width="2"
              height="4"
              rx="1"
              fill="#86efac"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
