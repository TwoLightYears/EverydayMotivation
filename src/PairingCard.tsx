import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  spring,
  useVideoConfig,
  interpolate,
  Easing,
  staticFile,
} from "remotion";

const inter = "Inter, system-ui, sans-serif";
const playfair = "'Playfair Display', Georgia, serif";

const fontCss = `
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-400-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-600-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: italic;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-italic.woff2")}) format('woff2');
}
`;

// Palette — taken from the concept's visual brief.
const SPACE = "#050814";
const BOARD = "#0A0E1B";
const PULSAR_BLUE = "#8FB8FF";
const MAGNET_VIOLET = "#E8B2FF";
const BRASS = "#FFE8B5";
const GRAY = "#B9BDC7";
const GRAY_DIM = "#5B6070";
const GRID = "#131829";
const GRID_MAJOR = "#1B213A";
const INK = "#EDEEF3";

// ── Layout constants (1080 × 1350) ────────────────────────────────────
const PAGE_W = 1080;
const PAGE_H = 1350;

const FRAME = { x: 60, y: 130, w: 960, h: 720 };
const DIAL = {
  cx: FRAME.x + FRAME.w / 2,
  cy: FRAME.y + FRAME.h / 2,
  rOuter: 300,
  rInner: 268,
  rTickMinor: 262,
  rTickMinorInner: 252,
  rTickMajor: 262,
  rTickMajorInner: 238,
  rNumeral: 214,
  rBeamStart: 60,
  rBeamEnd: 296,
};

// Star and beam geometry
const STAR_CORE_R = 22;
const STAR_GLOW_R = 60;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Motion timing ──────────────────────────────────────────────────
  // Intro settle (0.0 → 0.9s): dial fades in, then beams spring into rotation.
  const dialFade = interpolate(frame, [0, fps * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const starPop = spring({
    frame: frame - fps * 0.25,
    fps,
    config: { damping: 12, mass: 0.8, stiffness: 140 },
  });

  const beamSpringIn = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 200, mass: 1.1 },
  });

  // Beam rotation: 1 rotation every 1.2s once settled.
  // We drive it as an angle so we can reveal ticks the moment the beam sweeps past.
  const rotSpeed = (2 * Math.PI) / (fps * 1.2); // rad per frame
  const beamAngle = beamSpringIn * frame * rotSpeed;

  // Rotation counter (integer count of full revolutions)
  const revolutions = Math.floor(beamAngle / (2 * Math.PI));

  // Type block timing
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dataOpacity = interpolate(frame, [fps * 0.9, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ticks: 60 minor, 12 major (every 5).
  const ticks: JSX.Element[] = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2; // 12 o'clock at top
    const isMajor = i % 5 === 0;

    // Highlight if either beam has swept past within the last ~0.18 rad.
    const beamA = ((beamAngle - Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) %
      (Math.PI * 2);
    const beamB = (beamA + Math.PI) % (Math.PI * 2);
    const tickA = ((a + Math.PI * 2) % (Math.PI * 2));
    // shortest arc from either beam behind the tick
    const arc = (from: number, to: number) => {
      // measures how far *behind* the beam the tick is (positive = beam has swept past it recently)
      return ((from - to + Math.PI * 2) % (Math.PI * 2));
    };
    const trailA = arc(beamA, tickA);
    const trailB = arc(beamB, tickA);
    const trail = Math.min(trailA, trailB);
    const highlight = Math.max(0, 1 - trail / 0.45); // fade off after ~26°

    const rOut = isMajor ? DIAL.rTickMajor : DIAL.rTickMinor;
    const rIn = isMajor ? DIAL.rTickMajorInner : DIAL.rTickMinorInner;
    const x1 = DIAL.cx + Math.cos(a) * rIn;
    const y1 = DIAL.cy + Math.sin(a) * rIn;
    const x2 = DIAL.cx + Math.cos(a) * rOut;
    const y2 = DIAL.cy + Math.sin(a) * rOut;

    const baseColor = isMajor ? BRASS : GRAY_DIM;
    const litColor = BRASS;
    // interpolate stroke opacity for glow effect
    const strokeOpacity = isMajor ? 0.9 : 0.55;
    ticks.push(
      <g key={`tick-${i}`} opacity={dialFade}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={baseColor}
          strokeOpacity={strokeOpacity}
          strokeWidth={isMajor ? 3 : 1.5}
          strokeLinecap="square"
        />
        {highlight > 0.01 && (
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={litColor}
            strokeOpacity={highlight * 0.95}
            strokeWidth={isMajor ? 4 : 2}
            strokeLinecap="round"
          />
        )}
      </g>,
    );
  }

  // Numerals at 12 / 3 / 6 / 9
  const numerals = [
    { n: "XII", a: -Math.PI / 2 },
    { n: "III", a: 0 },
    { n: "VI", a: Math.PI / 2 },
    { n: "IX", a: Math.PI },
  ];

  // Beam path helpers
  const beamPath = (angle: number, wideRad: number) => {
    const a1 = angle - wideRad / 2;
    const a2 = angle + wideRad / 2;
    const x1 = DIAL.cx + Math.cos(angle) * DIAL.rBeamStart;
    const y1 = DIAL.cy + Math.sin(angle) * DIAL.rBeamStart;
    const x2 = DIAL.cx + Math.cos(a1) * DIAL.rBeamEnd;
    const y2 = DIAL.cy + Math.sin(a1) * DIAL.rBeamEnd;
    const x3 = DIAL.cx + Math.cos(a2) * DIAL.rBeamEnd;
    const y3 = DIAL.cy + Math.sin(a2) * DIAL.rBeamEnd;
    return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
  };

  const dataX = FRAME.x + FRAME.w - 14;
  const dataY = FRAME.y + 42;
  const dataLabelX = -128;

  return (
    <AbsoluteFill style={{ backgroundColor: SPACE, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: BRASS }}>2026 · 08 · 13</span>
      </div>

      {/* ── Main SVG (frame, dial, star, beams, data) ───────────────── */}
      <svg
        width={PAGE_W}
        height={PAGE_H}
        viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Fine grid inside the frame */}
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 40 0 L 0 0 0 40`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160}
            height={160}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 160 0 L 0 0 0 160`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0F1428" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="star-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <stop offset="45%" stopColor={PULSAR_BLUE} stopOpacity={1} />
            <stop offset="100%" stopColor={PULSAR_BLUE} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="magnetosphere" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MAGNET_VIOLET} stopOpacity={0.75} />
            <stop offset="60%" stopColor={MAGNET_VIOLET} stopOpacity={0.15} />
            <stop offset="100%" stopColor={MAGNET_VIOLET} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={BRASS} stopOpacity={0.05} />
            <stop offset="18%" stopColor={BRASS} stopOpacity={0.55} />
            <stop offset="55%" stopColor={PULSAR_BLUE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PULSAR_BLUE} stopOpacity={0} />
          </linearGradient>

          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <filter id="softer" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* ── Drafting board ─────────────────────────────────────────── */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#board-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />
        {/* Inner border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#212842"
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={BRASS} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Small ident labels along the frame (draftsman aesthetic) */}
        <g
          fill={GRAY_DIM}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <text x={FRAME.x + 26} y={FRAME.y + 30}>
            OBS · JODRELL BANK
          </text>
          <text
            x={FRAME.x + FRAME.w - 26}
            y={FRAME.y + FRAME.h - 24}
            textAnchor="end"
          >
            FIG. 1 · PSR B1937+21 DIAL
          </text>
        </g>

        {/* ── Dial ─────────────────────────────────────────────────── */}
        <g opacity={dialFade}>
          {/* Concentric bezel rings */}
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.rOuter}
            fill="none"
            stroke={GRAY_DIM}
            strokeOpacity={0.5}
            strokeWidth={1.2}
          />
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.rOuter - 8}
            fill="none"
            stroke={BRASS}
            strokeOpacity={0.35}
            strokeWidth={0.8}
          />
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.rInner}
            fill="none"
            stroke={GRAY_DIM}
            strokeOpacity={0.35}
            strokeWidth={1}
          />
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.rInner - 60}
            fill="none"
            stroke={GRAY_DIM}
            strokeOpacity={0.2}
            strokeWidth={0.8}
            strokeDasharray="2 4"
          />

          {/* Ticks (60) */}
          {ticks}

          {/* Roman numerals */}
          {numerals.map((num) => {
            const x = DIAL.cx + Math.cos(num.a) * DIAL.rNumeral;
            const y = DIAL.cy + Math.sin(num.a) * DIAL.rNumeral;
            return (
              <text
                key={num.n}
                x={x}
                y={y + 6}
                textAnchor="middle"
                fill={GRAY}
                fontFamily={playfair}
                fontSize={22}
                fontStyle="italic"
                fontWeight={500}
                letterSpacing={1}
                opacity={0.85}
              >
                {num.n}
              </text>
            );
          })}
        </g>

        {/* ── Beams from magnetic poles (rotating) ─────────────────── */}
        <g opacity={dialFade}>
          {[0, Math.PI].map((offset, idx) => {
            const a = beamAngle - Math.PI / 2 + offset;
            // Wide soft outer cone
            return (
              <g key={idx}>
                {/* soft outer glow */}
                <path
                  d={beamPath(a, 0.34)}
                  fill="url(#beam-grad)"
                  opacity={0.55 * beamSpringIn}
                  filter="url(#softer)"
                  transform={`rotate(${(a * 180) / Math.PI - 0} ${DIAL.cx} ${DIAL.cy})`}
                  style={{ transformOrigin: `${DIAL.cx}px ${DIAL.cy}px` }}
                />
                {/* mid cone */}
                <path
                  d={beamPath(a, 0.18)}
                  fill="url(#beam-grad)"
                  opacity={0.85 * beamSpringIn}
                  filter="url(#soft)"
                />
                {/* bright core line */}
                <line
                  x1={DIAL.cx + Math.cos(a) * DIAL.rBeamStart}
                  y1={DIAL.cy + Math.sin(a) * DIAL.rBeamStart}
                  x2={DIAL.cx + Math.cos(a) * DIAL.rBeamEnd}
                  y2={DIAL.cy + Math.sin(a) * DIAL.rBeamEnd}
                  stroke={BRASS}
                  strokeOpacity={0.9 * beamSpringIn}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </g>

        {/* ── Neutron star at the pivot ───────────────────────────── */}
        <g
          style={{
            transform: `scale(${starPop})`,
            transformOrigin: `${DIAL.cx}px ${DIAL.cy}px`,
          }}
        >
          {/* Outer magnetosphere corona */}
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={STAR_GLOW_R}
            fill="url(#magnetosphere)"
          />
          {/* Rotation axis hairline */}
          <line
            x1={DIAL.cx}
            y1={DIAL.cy - 78}
            x2={DIAL.cx}
            y2={DIAL.cy + 78}
            stroke={GRAY_DIM}
            strokeOpacity={0.55 * dialFade}
            strokeDasharray="2 4"
            strokeWidth={1}
          />
          {/* Star core */}
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={STAR_CORE_R + 8}
            fill="url(#star-core)"
            opacity={0.9}
          />
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={STAR_CORE_R}
            fill="#FFFFFF"
          />
          {/* Pivot dot */}
          <circle cx={DIAL.cx} cy={DIAL.cy} r={3} fill={SPACE} />
        </g>

        {/* ── Data cluster (upper-right of the frame, stacked lab plate) ── */}
        <g
          opacity={dataOpacity}
          fontFamily={inter}
          transform={`translate(${dataX}, ${dataY})`}
        >
          {/* Header */}
          <text
            x={0}
            y={0}
            textAnchor="end"
            fill={BRASS}
            fontSize={10}
            letterSpacing={4}
            fontWeight={600}
          >
            SPECIMEN
          </text>
          <text
            x={0}
            y={26}
            textAnchor="end"
            fill={INK}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={22}
            fontWeight={500}
          >
            PSR B1937+21
          </text>

          {/* Divider */}
          <line
            x1={dataLabelX}
            y1={42}
            x2={0}
            y2={42}
            stroke={GRAY_DIM}
            strokeWidth={1}
          />

          {/* Data rows — label above value, right-aligned */}
          {(
            [
              { label: "PERIOD", value: "1.5578 ms", accent: false },
              { label: "FREQUENCY", value: "641.9 Hz", accent: false },
              { label: "STABILITY", value: "Δf/f ≈ 10⁻¹⁵", accent: true },
            ] as const
          ).map((row, i) => {
            const yTop = 62 + i * 40;
            return (
              <g key={row.label}>
                <text
                  x={0}
                  y={yTop}
                  textAnchor="end"
                  fill={GRAY}
                  fontSize={10}
                  letterSpacing={3.2}
                  fontWeight={500}
                >
                  {row.label}
                </text>
                <text
                  x={0}
                  y={yTop + 18}
                  textAnchor="end"
                  fill={row.accent ? BRASS : INK}
                  fontSize={16}
                  letterSpacing={0.5}
                  fontWeight={row.accent ? 600 : 500}
                >
                  {row.value}
                </text>
              </g>
            );
          })}

          {/* Rotation counter (below, separated by dashed rule) */}
          <line
            x1={dataLabelX}
            y1={192}
            x2={0}
            y2={192}
            stroke={GRAY_DIM}
            strokeOpacity={0.55}
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <g transform="translate(0, 210)">
            <text
              x={0}
              y={0}
              textAnchor="end"
              fill={BRASS}
              fontSize={10}
              letterSpacing={4}
              fontWeight={600}
            >
              ROTATIONS
            </text>
            <text
              x={0}
              y={40}
              textAnchor="end"
              fill={INK}
              fontFamily={playfair}
              fontStyle="italic"
              fontSize={40}
              fontWeight={500}
            >
              {String(revolutions).padStart(3, "0")}
            </text>
            <text
              x={0}
              y={58}
              textAnchor="end"
              fill={GRAY_DIM}
              fontSize={9}
              letterSpacing={2.4}
              fontWeight={500}
            >
              SIM · SLOWED 500×
            </text>
          </g>
        </g>

        {/* Caption strip below the frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · TWIN RADIO BEAMS FROM MAGNETIC POLES</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={BRASS}
            opacity={0.85}
          >
            ONE TICK EVERY 1.5578 MILLISECONDS
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 915,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [16, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: BRASS,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: INK, letterSpacing: 5 }}>Watchmaker</span>
        </div>

        <div
          style={{
            color: INK,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The neutron
          <br />
          watchmaker.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          <span style={{ color: BRASS, fontWeight: 600 }}>PSR B1937+21</span> —
          the first millisecond pulsar, discovered in 1982 — spins{" "}
          <span style={{ color: BRASS, fontWeight: 600 }}>641.9 times</span> a
          second, its ticks stable to about{" "}
          <span style={{ color: BRASS, fontWeight: 600 }}>one part in 10¹⁵</span>
          {" "}over years. Astronomers now use these stellar corpses as a
          galaxy-scale set of watch movements — precise enough to hear
          gravitational waves in their jitter.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Backer et al. · Nature 300 (1982) 615–618</span>
        <span>
          <span style={{ color: BRASS }}>●</span> Beam = radio pulse
        </span>
      </div>

      {/* silence unused warning while keeping length declaration available */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
