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

// ── Palette (from the concept brief) ─────────────────────────────────
const PAPER = "#F1E7D2";        // chart paper / cream ground
const PAPER_WARM = "#EADFC6";   // slightly darker paper for insets
const INK = "#141519";          // mole-fur near-black
const INK_SOFT = "#2E2F35";     // secondary ink
const RULE = "#B7A98A";         // ruled line
const RULE_SOFT = "#C8BCA0";    // ledger lines
const TEAL = "#1F5A5E";         // clinical teal
const TEAL_SOFT = "#3F797E";
const FLESH = "#E7A2A6";        // nose pink
const FLESH_DIM = "#C57A80";
const AMBER = "#E3803A";        // triage accent
const AMBER_SOFT = "#C86A26";

// ── Layout constants (1080 × 1350) ───────────────────────────────────
const PAGE_W = 1080;
const PAGE_H = 1350;

const FRAME = { x: 60, y: 130, w: 960, h: 720 };
const DIAL = {
  cx: FRAME.x + FRAME.w / 2,
  cy: FRAME.y + 350,   // 480
  rOuter: 285,         // outer bezel line
  rTick: 281,          // tick outer
  rTickInner: 265,     // minor tick inner
  rMajorInner: 252,    // major tick inner
  rNumber: 226,        // numeric labels INSIDE the ticks
  rHead: 52,           // small central dark hub — mole head
  raySnout: 32,        // pink snout radius
  rayInner: 42,        // tentacle start
  rayOuter: 214,       // tentacle end — sits clearly inside numeric labels
};

const N_RAYS = 22;

// One primary ray currently under the amber "CONFIRM" flash.
// The sweep pointer moves; every ~120ms cycle, the amber ray fires.
const RAY_CONFIRM_INDEX = 4; // Star-nosed moles use ray 11 for detail; we mark one distinguished ray.

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Motion timing ─────────────────────────────────────────────────
  const paperFade = interpolate(frame, [0, fps * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headPop = spring({
    frame: frame - fps * 0.2,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 130 },
  });

  const raysIn = spring({
    frame: frame - fps * 0.55,
    fps,
    config: { damping: 200, mass: 1.0 },
  });

  // Sweep pointer: 12 rays per second → pointer completes one full loop
  // in (22 / 12) ≈ 1.83 seconds. We drive an angle so ticks light in step.
  const sweepStart = fps * 0.75;
  const sweepAngle = interpolate(
    Math.max(0, frame - sweepStart),
    [0, fps * 1.83],
    [0, Math.PI * 2],
    { extrapolateRight: "extend" },
  );

  // Amber "CONFIRM" pulse every ~120ms of "sim" time (loops nicely at 3.6s).
  const confirmCycle = 0.36 * fps; // 360ms real-time per confirm pulse
  const confirmPhase = ((frame - fps * 0.6) % confirmCycle) / confirmCycle;
  const confirm = confirmPhase >= 0 && confirmPhase < 0.35
    ? Math.pow(1 - confirmPhase / 0.35, 1.6)
    : 0;
  const showConfirm = frame > fps * 0.75;

  // Type block timing
  const titleSpring = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.15, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dataOpacity = interpolate(frame, [fps * 0.9, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ray angles: full 360° in 22 steps, starting at top
  const rayAngle = (i: number) => -Math.PI / 2 + (i / N_RAYS) * Math.PI * 2;

  // All rays sit at full length once settled; a small "flick" adds ~6% on
  // the ray the pointer just passed. That way the star always reads whole,
  // and motion is a delicate tick, not a whip.
  const rayFlick = (i: number) => {
    const a = ((rayAngle(i) + Math.PI * 2) % (Math.PI * 2));
    const sweep = ((sweepAngle - Math.PI / 2 + Math.PI * 2) % (Math.PI * 2));
    const behind = (sweep - a + Math.PI * 2) % (Math.PI * 2);
    const near = Math.max(0, 1 - behind / 0.35);
    const base = 0.92; // baseline extension of every ray
    const bump = 0.10 * near;
    return raysIn * (base + bump);
  };

  // Millisecond tick marks around the outer ring: 0 → 120 ms, in 12 major
  // and 60 minor ticks. The dial spans a full circle so the visual reads as
  // "a stopwatch dial with a nose star inside".
  const N_TICKS = 60;
  const TICK_LABELS = [
    { i: 0, label: "0" },
    { i: 10, label: "20" },
    { i: 20, label: "40" },
    { i: 30, label: "60" },
    { i: 40, label: "80" },
    { i: 50, label: "100" },
  ];

  const ticks: JSX.Element[] = [];
  for (let i = 0; i < N_TICKS; i++) {
    const a = -Math.PI / 2 + (i / N_TICKS) * Math.PI * 2;
    const isMajor = i % 5 === 0;
    const rIn = isMajor ? DIAL.rMajorInner : DIAL.rTickInner;
    const rOut = DIAL.rTick;
    const x1 = DIAL.cx + Math.cos(a) * rIn;
    const y1 = DIAL.cy + Math.sin(a) * rIn;
    const x2 = DIAL.cx + Math.cos(a) * rOut;
    const y2 = DIAL.cy + Math.sin(a) * rOut;

    // Highlight ticks that the pointer just passed.
    const sweep = ((sweepAngle - Math.PI / 2 + Math.PI * 2) % (Math.PI * 2));
    const tickA = ((a + Math.PI * 2) % (Math.PI * 2));
    const behind = (sweep - tickA + Math.PI * 2) % (Math.PI * 2);
    const highlight = Math.max(0, 1 - behind / 0.35);

    ticks.push(
      <g key={`tk-${i}`} opacity={paperFade}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={INK_SOFT}
          strokeOpacity={isMajor ? 0.85 : 0.4}
          strokeWidth={isMajor ? 2 : 1}
          strokeLinecap="square"
        />
        {highlight > 0.01 && (
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={AMBER}
            strokeOpacity={highlight * 0.9}
            strokeWidth={isMajor ? 3 : 1.6}
            strokeLinecap="round"
          />
        )}
      </g>,
    );
  }

  // Sweep pointer position
  const pointerA = sweepAngle - Math.PI / 2;
  const pointerX = DIAL.cx + Math.cos(pointerA) * (DIAL.rTick - 6);
  const pointerY = DIAL.cy + Math.sin(pointerA) * (DIAL.rTick - 6);

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily: inter }}>
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
          color: TEAL,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 600,
          opacity: paperFade,
        }}
      >
        <span>Everyday Motivation · No. 004</span>
        <span style={{ color: AMBER }}>2026 · 08 · 14</span>
      </div>

      {/* ── Main SVG ─────────────────────────────────────────────────── */}
      <svg
        width={PAGE_W}
        height={PAGE_H}
        viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Fine ledger lines inside the chart */}
          <pattern
            id="ledger"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path d="M 0 40 L 40 40" fill="none" stroke={RULE_SOFT} strokeOpacity={0.35} strokeWidth={0.8} />
          </pattern>

          <linearGradient id="paper-shade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={PAPER} />
            <stop offset="100%" stopColor={PAPER_WARM} />
          </linearGradient>

          {/* Nose flesh gradient — soft dome */}
          <radialGradient id="ray-flesh" cx="30%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#F6C8CB" />
            <stop offset="60%" stopColor={FLESH} />
            <stop offset="100%" stopColor={FLESH_DIM} />
          </radialGradient>

          {/* Dark mole head silhouette */}
          <radialGradient id="head" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#292A31" />
            <stop offset="70%" stopColor={INK} />
            <stop offset="100%" stopColor="#08090C" />
          </radialGradient>

          {/* Amber pulse gradient for the confirmation halo */}
          <radialGradient id="confirm-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.85} />
            <stop offset="60%" stopColor={AMBER} stopOpacity={0.2} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <filter id="softer" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* ── Chart card ─────────────────────────────────────────────── */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#paper-shade)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#ledger)"
        />
        {/* Card border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={TEAL}
          strokeOpacity={0.55}
          strokeWidth={1.2}
        />
        <rect
          x={FRAME.x + 12}
          y={FRAME.y + 12}
          width={FRAME.w - 24}
          height={FRAME.h - 24}
          fill="none"
          stroke={RULE}
          strokeOpacity={0.55}
          strokeWidth={0.8}
        />

        {/* Corner reg marks */}
        {(
          [
            [FRAME.x + 6, FRAME.y + 6, 1, 1],
            [FRAME.x + FRAME.w - 6, FRAME.y + 6, -1, 1],
            [FRAME.x + 6, FRAME.y + FRAME.h - 6, 1, -1],
            [FRAME.x + FRAME.w - 6, FRAME.y + FRAME.h - 6, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={TEAL} strokeWidth={1.5} fill="none" opacity={0.7}>
            <line x1={cx} y1={cy} x2={cx + sx * 18} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 18} />
          </g>
        ))}

        {/* Top header inside chart */}
        <g
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.2}
          fontWeight={600}
          fill={TEAL}
          opacity={paperFade}
        >
          <text x={FRAME.x + 34} y={FRAME.y + 42}>TRIAGE CHART · CONDYLURA CRISTATA</text>
          <text
            x={FRAME.x + FRAME.w - 34}
            y={FRAME.y + 42}
            textAnchor="end"
            fill={INK_SOFT}
          >
            FIG. 1 · SENSORY FAN
          </text>
        </g>
        {/* Divider under header */}
        <line
          x1={FRAME.x + 34}
          y1={FRAME.y + 58}
          x2={FRAME.x + FRAME.w - 34}
          y2={FRAME.y + 58}
          stroke={TEAL}
          strokeOpacity={0.55}
          strokeWidth={1}
        />

        {/* ── Outer millisecond dial ──────────────────────────────────── */}
        <g opacity={paperFade}>
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.rOuter}
            fill="none"
            stroke={TEAL}
            strokeOpacity={0.55}
            strokeWidth={1.6}
          />
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.rOuter - 12}
            fill="none"
            stroke={RULE}
            strokeOpacity={0.5}
            strokeWidth={0.8}
          />
          {ticks}
          {/* Numeric labels around the dial */}
          {TICK_LABELS.map((t) => {
            const a = -Math.PI / 2 + (t.i / N_TICKS) * Math.PI * 2;
            const x = DIAL.cx + Math.cos(a) * DIAL.rNumber;
            const y = DIAL.cy + Math.sin(a) * DIAL.rNumber;
            return (
              <text
                key={t.i}
                x={x}
                y={y + 5}
                textAnchor="middle"
                fill={INK}
                fontFamily={playfair}
                fontStyle="italic"
                fontWeight={500}
                fontSize={18}
                opacity={0.9}
              >
                {t.label}
              </text>
            );
          })}
          {/* Unit hint below the "0" mark */}
          <text
            x={DIAL.cx}
            y={DIAL.cy - DIAL.rNumber + 22}
            textAnchor="middle"
            fill={TEAL}
            fontFamily={inter}
            fontSize={9.5}
            letterSpacing={3.4}
            fontWeight={600}
          >
            MS
          </text>
        </g>

        {/* ── Concentric guide rings behind rays ──────────────────────── */}
        <g opacity={paperFade * 0.7}>
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.rayOuter}
            fill="none"
            stroke={TEAL_SOFT}
            strokeOpacity={0.35}
            strokeWidth={0.8}
            strokeDasharray="2 5"
          />
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={(DIAL.rayInner + DIAL.rayOuter) / 2}
            fill="none"
            stroke={TEAL_SOFT}
            strokeOpacity={0.22}
            strokeWidth={0.6}
            strokeDasharray="1 4"
          />
        </g>

        {/* ── 22 nose rays (tentacles) ───────────────────────────────── */}
        <g>
          {Array.from({ length: N_RAYS }).map((_, i) => {
            const a = rayAngle(i);
            const flick = rayFlick(i);
            const rIn = DIAL.rayInner;
            const rOut = DIAL.rayInner + (DIAL.rayOuter - DIAL.rayInner) * flick;
            const isConfirm = i === RAY_CONFIRM_INDEX && showConfirm && confirm > 0.02;
            const baseColor = isConfirm ? AMBER : FLESH;
            const stemColor = isConfirm ? AMBER_SOFT : FLESH_DIM;

            // Ray as a slim tapered lozenge (wider at base, tip small).
            const wBase = 14;
            const wTip = 3.5;

            // Perpendicular unit vector
            const px = -Math.sin(a);
            const py = Math.cos(a);

            const bx1 = DIAL.cx + Math.cos(a) * rIn + px * (wBase / 2);
            const by1 = DIAL.cy + Math.sin(a) * rIn + py * (wBase / 2);
            const bx2 = DIAL.cx + Math.cos(a) * rIn - px * (wBase / 2);
            const by2 = DIAL.cy + Math.sin(a) * rIn - py * (wBase / 2);
            const tx1 = DIAL.cx + Math.cos(a) * rOut + px * (wTip / 2);
            const ty1 = DIAL.cy + Math.sin(a) * rOut + py * (wTip / 2);
            const tx2 = DIAL.cx + Math.cos(a) * rOut - px * (wTip / 2);
            const ty2 = DIAL.cy + Math.sin(a) * rOut - py * (wTip / 2);

            // Tentacle path with rounded tip
            const path = `M ${bx1} ${by1} L ${tx1} ${ty1} Q ${DIAL.cx + Math.cos(a) * (rOut + 6)} ${DIAL.cy + Math.sin(a) * (rOut + 6)} ${tx2} ${ty2} L ${bx2} ${by2} Z`;

            return (
              <g key={`ray-${i}`}>
                {/* Under-shadow */}
                <path
                  d={path}
                  fill={stemColor}
                  opacity={0.55}
                  filter="url(#soft)"
                  transform={`translate(0.6 0.6)`}
                />
                {/* Ray body */}
                <path
                  d={path}
                  fill={isConfirm ? AMBER : "url(#ray-flesh)"}
                  opacity={raysIn}
                />
                {/* Center highlight line */}
                <line
                  x1={DIAL.cx + Math.cos(a) * (rIn + 6)}
                  y1={DIAL.cy + Math.sin(a) * (rIn + 6)}
                  x2={DIAL.cx + Math.cos(a) * (rOut - 4)}
                  y2={DIAL.cy + Math.sin(a) * (rOut - 4)}
                  stroke="#FBE1E3"
                  strokeOpacity={0.55 * raysIn}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
                {/* Terminal dot — Eimer's organ marker */}
                <circle
                  cx={DIAL.cx + Math.cos(a) * (rOut + 3)}
                  cy={DIAL.cy + Math.sin(a) * (rOut + 3)}
                  r={isConfirm ? 3.4 : 2.2}
                  fill={baseColor}
                  opacity={raysIn}
                />
              </g>
            );
          })}
        </g>

        {/* ── Central hub: small mole head + pink snout ──────────────── */}
        <g
          style={{
            transform: `scale(${headPop})`,
            transformOrigin: `${DIAL.cx}px ${DIAL.cy}px`,
          }}
        >
          {/* soft under-glow */}
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy + 4}
            r={DIAL.rHead + 12}
            fill="#000"
            opacity={0.18}
            filter="url(#softer)"
          />
          {/* head silhouette (small hub, not the whole composition) */}
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.rHead}
            fill="url(#head)"
          />
          {/* fine fur rim */}
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.rHead - 1}
            fill="none"
            stroke="#3E4048"
            strokeOpacity={0.4}
            strokeWidth={0.8}
          />
          {/* Pink snout disk */}
          <circle
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.raySnout}
            fill="url(#ray-flesh)"
          />
          {/* Nostrils */}
          <ellipse cx={DIAL.cx - 9} cy={DIAL.cy + 4} rx={3.2} ry={5.5} fill="#5A2C31" />
          <ellipse cx={DIAL.cx + 9} cy={DIAL.cy + 4} rx={3.2} ry={5.5} fill="#5A2C31" />
          {/* Central pivot dot */}
          <circle cx={DIAL.cx} cy={DIAL.cy - 10} r={1.6} fill="#5A2C31" opacity={0.7} />
        </g>

        {/* ── Sweep pointer (thin amber needle riding the outer dial) ─ */}
        {frame > sweepStart && (
          <g opacity={raysIn}>
            <line
              x1={DIAL.cx + Math.cos(pointerA) * DIAL.rayInner * 0.55}
              y1={DIAL.cy + Math.sin(pointerA) * DIAL.rayInner * 0.55}
              x2={pointerX}
              y2={pointerY}
              stroke={AMBER}
              strokeOpacity={0.7}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <circle cx={pointerX} cy={pointerY} r={4} fill={AMBER} />
            <circle cx={pointerX} cy={pointerY} r={9} fill={AMBER} opacity={0.25} filter="url(#soft)" />
          </g>
        )}

        {/* ── Confirmation halo behind the accent ray ─────────────────── */}
        {showConfirm && confirm > 0.02 && (() => {
          const a = rayAngle(RAY_CONFIRM_INDEX);
          const hx = DIAL.cx + Math.cos(a) * (DIAL.rayOuter + 16);
          const hy = DIAL.cy + Math.sin(a) * (DIAL.rayOuter + 16);
          const r = 40 + 22 * (1 - confirm);
          return (
            <g opacity={0.9 * confirm}>
              <circle cx={hx} cy={hy} r={r} fill="url(#confirm-halo)" />
              <circle
                cx={hx}
                cy={hy}
                r={r * 0.55}
                fill="none"
                stroke={AMBER}
                strokeOpacity={0.55}
                strokeWidth={1.2}
              />
            </g>
          );
        })()}

        {/* ── Divider above stats ───────────────────────────────────── */}
        <line
          x1={FRAME.x + 34}
          y1={FRAME.y + FRAME.h - 128}
          x2={FRAME.x + FRAME.w - 34}
          y2={FRAME.y + FRAME.h - 128}
          stroke={TEAL}
          strokeOpacity={0.35}
          strokeWidth={1}
          opacity={dataOpacity}
        />

        {/* ── Hero stat (left) + three sidekicks (right column) ─────── */}
        <g
          transform={`translate(${FRAME.x + 34}, ${FRAME.y + FRAME.h - 104})`}
          opacity={dataOpacity}
        >
          {/* HERO: 120 ms */}
          <text
            x={0}
            y={0}
            fill={AMBER}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.8}
            fontWeight={700}
          >
            HANDLING TIME · WORLD RECORD
          </text>
          <text
            x={0}
            y={64}
            fill={INK}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={78}
            fontWeight={500}
          >
            120
            <tspan
              dx={6}
              fontSize={30}
              fill={AMBER_SOFT}
              fontStyle="normal"
              fontFamily={inter}
              fontWeight={600}
            >
              ms
            </tspan>
          </text>
          <text
            x={0}
            y={88}
            fill={INK_SOFT}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={2.4}
            fontWeight={500}
          >
            TOUCH → DECIDE → SWALLOW
          </text>

          {/* Sidekick stack (three small stats, right side) */}
          <g transform={`translate(${FRAME.w - 68}, 0)`}>
            {(
              [
                { label: "TENTACLE RAYS", value: "22" },
                { label: "EIMER'S ORGANS", value: "25 000+" },
                { label: "TOUCHES / SEC", value: "10–13" },
              ] as const
            ).map((row, i) => {
              const y = i * 30;
              return (
                <g key={row.label}>
                  <text
                    x={-170}
                    y={y}
                    fill={TEAL}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={3.2}
                    fontWeight={600}
                    textAnchor="end"
                  >
                    {row.label}
                  </text>
                  <line
                    x1={-160}
                    y1={y - 4}
                    x2={-24}
                    y2={y - 4}
                    stroke={RULE}
                    strokeOpacity={0.35}
                    strokeWidth={0.6}
                    strokeDasharray="1 3"
                  />
                  <text
                    x={0}
                    y={y}
                    fill={INK}
                    fontFamily={playfair}
                    fontStyle="italic"
                    fontSize={22}
                    fontWeight={500}
                    textAnchor="end"
                  >
                    {row.value}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* ── Type lockup (below the chart) ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 950,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [18, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: TEAL,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 700,
          }}
        >
          Role <span style={{ color: RULE, margin: "0 4px" }}>/</span>
          <span style={{ color: INK, letterSpacing: 5 }}>ER Triage Nurse</span>
        </div>

        <div
          style={{
            color: INK,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 92,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The mammal
          <br />
          triage nurse.
        </div>

        <div
          style={{
            marginTop: 32,
            color: INK_SOFT,
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.44,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          The <span style={{ color: TEAL, fontWeight: 600 }}>star-nosed mole</span>
          {" "}wears <span style={{ color: TEAL, fontWeight: 600 }}>22 fleshy rays</span>
          {" "}packed with <span style={{ color: TEAL, fontWeight: 600 }}>25 000+ Eimer's organs</span>
          {" "}— the densest touch field known. It fingers
          {" "}<span style={{ color: TEAL, fontWeight: 600 }}>12 targets a second</span>
          {" "}and can identify, decide on and swallow prey in
          {" "}<span style={{ color: AMBER, fontWeight: 700 }}>120 milliseconds</span>
          {" "}— the fastest triage in any mammal.
        </div>
      </div>

      {/* Footer — carries the citation now that it's off the chart */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 46,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: TEAL,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        <span>Catania &amp; Remple · Nature 433 (2005) 519–522</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Specimen No. 004
        </span>
      </div>

      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
