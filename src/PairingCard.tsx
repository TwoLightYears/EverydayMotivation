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

// Palette — brief
const INK = "#0A0E16";
const BOARD = "#10151F";
const SLATE = "#2E3A4A";
const SLATE_HI = "#3C4A5C";
const SLATE_DK = "#1C2432";
const BUFF = "#D4C3A2";
const RUST = "#8B4A2B";
const SKY = "#C8D7E8";
const GRAY = "#7E8698";
const GRID = "#171D29";
const GRID_MAJOR = "#1E2635";

// ── Gauge geometry (map coord 1080 × 800) ────────────────────────────────
const CX = 600;
const CY = 420;
const R_OUTER = 300;
const R_RING = 282;
const R_TICK_OUT = 274;
const R_TICK_MAJOR_IN = 244;
const R_TICK_MINOR_IN = 258;
const R_LABEL = 338; // moved OUTSIDE the dial
const SWEEP = 140; // degrees each side of top

const gaugeAngleDeg = (value: number) => {
  const t = Math.max(0, Math.min(1, value / 400));
  return -SWEEP + t * SWEEP * 2;
};
const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};
const arcPath = (
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) => {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
};

const MAJOR_TICKS = [0, 100, 200, 300, 400];
const MINOR_TICKS = Array.from({ length: 41 }, (_, i) => i * 10).filter(
  (v) => v % 100 !== 0,
);

// The diving falcon lives upper-left-of-hub; it is a dart with the beak
// pointing DOWN toward the hub (CX, CY), so it "falls into" the gauge.
const FALCON_HOME_X = CX - 150;
const FALCON_HOME_Y = CY - 150;
const FALCON_SCALE_FINAL = 1.0; // body ≈ 330 px tall at scale 1

// Wind streaks — curves that flow DOWN past the diving falcon, from above
// its head down to below its tail, on both flanks and slightly behind.
type Streak = { path: string; dash: number; w: number; op: number };
const makeStreaks = (): Streak[] => {
  const out: Streak[] = [];
  // LEFT-flank streaks: start upper-left of bird's current pos, curve DOWN
  // past its left shoulder and continue below.
  for (let i = 0; i < 7; i++) {
    const sxOff = -70 - i * 10;
    const yStart = FALCON_HOME_Y - 180 + i * 14;
    const xStart = FALCON_HOME_X + sxOff;
    const yEnd = FALCON_HOME_Y + 300 + i * 8;
    const xEnd = FALCON_HOME_X + sxOff + 20 + i * 3;
    const c1x = FALCON_HOME_X + sxOff - 20;
    const c1y = FALCON_HOME_Y + 20;
    const c2x = FALCON_HOME_X + sxOff - 10;
    const c2y = FALCON_HOME_Y + 220;
    out.push({
      path: `M ${xStart} ${yStart} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${xEnd} ${yEnd}`,
      dash: 620,
      w: i === 0 || i === 4 ? 1.5 : 0.9,
      op: 0.3 + (i % 3) * 0.07,
    });
  }
  // RIGHT-flank streaks: curve past the right shoulder, between bird and needle.
  for (let i = 0; i < 5; i++) {
    const sxOff = 60 + i * 10;
    const yStart = FALCON_HOME_Y - 150 + i * 16;
    const xStart = FALCON_HOME_X + sxOff;
    const yEnd = FALCON_HOME_Y + 240 + i * 8;
    const xEnd = FALCON_HOME_X + sxOff - 10 - i * 2;
    const c1x = FALCON_HOME_X + sxOff + 20;
    const c1y = FALCON_HOME_Y + 30;
    const c2x = FALCON_HOME_X + sxOff + 10;
    const c2y = FALCON_HOME_Y + 180;
    out.push({
      path: `M ${xStart} ${yStart} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${xEnd} ${yEnd}`,
      dash: 560,
      w: i === 0 || i === 3 ? 1.3 : 0.9,
      op: 0.26 + (i % 3) * 0.07,
    });
  }
  return out;
};
const STREAKS = makeStreaks();

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const needleStart = fps * 0.3;
  const needleEnd = fps * 2.6;
  const needleProgress = interpolate(frame, [needleStart, needleEnd], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const idle =
    frame > needleEnd
      ? Math.sin(((frame - needleEnd) / fps) * Math.PI * 1.4) * 2
      : 0;
  const needleValue = needleProgress * 390 + idle;
  const needleAngle = gaugeAngleDeg(needleValue);

  // Falcon descent — enters from top-left of frame and settles at FALCON_HOME.
  const falconProgress = interpolate(frame, [0, fps * 2.4], [0, 1], {
    easing: Easing.bezier(0.5, 0, 0.6, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const falconY = interpolate(
    falconProgress,
    [0, 1],
    [FALCON_HOME_Y - 460, FALCON_HOME_Y],
  );
  const falconX = interpolate(
    falconProgress,
    [0, 1],
    [FALCON_HOME_X - 50, FALCON_HOME_X],
  );
  const falconScale = interpolate(
    falconProgress,
    [0, 1],
    [0.78 * FALCON_SCALE_FINAL, FALCON_SCALE_FINAL],
  );

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

  // ── Layout ───────────────────────────────────────────────────────
  const FRAME = { x: 60, y: 90, w: 960, h: 760 };
  const MAP_W = 1080;
  const MAP_H = 800;
  const scale = FRAME.w / MAP_W;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 42,
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
        <span style={{ color: BUFF }}>2026 · 11 · 03</span>
      </div>

      {/* Drafting frame + gauge */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={48 * scale}
            height={48 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${48 * scale} 0 L 0 0 0 ${48 * scale}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192 * scale}
            height={192 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${192 * scale} 0 L 0 0 0 ${192 * scale}`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#141A26" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="gauge-face" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor="#19202D" stopOpacity={1} />
            <stop offset="100%" stopColor="#0C1119" stopOpacity={1} />
          </radialGradient>

          <radialGradient id="falcon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={RUST} stopOpacity={0.2} />
            <stop offset="100%" stopColor={RUST} stopOpacity={0} />
          </radialGradient>

          <marker
            id="afarr"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={SKY} />
          </marker>
        </defs>

        {/* Drafting board */}
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

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2B313C"
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
          <g key={i} stroke={RUST} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Top-left plumb-line indicator */}
        <g
          transform={`translate(${FRAME.x + 24}, ${FRAME.y + 28})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={10}
          letterSpacing={3}
        >
          <text textAnchor="start">1 G ↓</text>
        </g>

        {/* Map transform — same coord space as before */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* Wind streaks — behind everything */}
          {STREAKS.map((s, i) => {
            const localT = Math.max(
              0,
              Math.min(1, (falconProgress - 0.1 - i * 0.03) / 0.55),
            );
            if (localT <= 0) return null;
            const dashOffset = s.dash * (1 - localT);
            return (
              <path
                key={`st-${i}`}
                d={s.path}
                stroke={SKY}
                strokeOpacity={s.op}
                strokeWidth={s.w}
                fill="none"
                strokeDasharray={s.dash}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}

          {/* ─── GAUGE FACE ─── */}
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER}
            fill="url(#gauge-face)"
            stroke={SLATE_HI}
            strokeWidth={2}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER - 8}
            fill="none"
            stroke={SLATE}
            strokeWidth={1}
          />

          {/* Background full-range arc */}
          <path
            d={arcPath(CX, CY, R_RING, -SWEEP, SWEEP)}
            fill="none"
            stroke={SLATE_HI}
            strokeWidth={2}
            opacity={0.55}
          />
          {/* Rust arc swept to current value */}
          <path
            d={arcPath(CX, CY, R_RING, -SWEEP, needleAngle)}
            fill="none"
            stroke={RUST}
            strokeWidth={8}
            strokeLinecap="round"
            opacity={0.9}
          />
          {/* Danger / stoop zone >320 km/h — a bolder outer arc that reads
              as a secondary scale ring, with the STOOP label following it */}
          <path
            d={arcPath(CX, CY, R_RING + 22, gaugeAngleDeg(320), SWEEP)}
            fill="none"
            stroke={RUST}
            strokeWidth={4}
            opacity={0.75}
            strokeLinecap="round"
          />
          {/* Short tick where the danger zone begins */}
          {(() => {
            const a = gaugeAngleDeg(320);
            const p1 = polar(CX, CY, R_RING + 10, a);
            const p2 = polar(CX, CY, R_RING + 34, a);
            return (
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={RUST}
                strokeWidth={2}
                opacity={0.8}
              />
            );
          })()}
          <text
            fontFamily={inter}
            fontSize={13}
            fontWeight={700}
            letterSpacing={4}
            fill={RUST}
            textAnchor="middle"
            {...(() => {
              const p = polar(CX, CY, R_RING + 56, gaugeAngleDeg(360));
              return { x: p.x, y: p.y + 4 };
            })()}
          >
            STOOP
          </text>

          {/* Minor ticks */}
          {MINOR_TICKS.map((v) => {
            const a = gaugeAngleDeg(v);
            const p1 = polar(CX, CY, R_TICK_OUT, a);
            const p2 = polar(CX, CY, R_TICK_MINOR_IN, a);
            return (
              <line
                key={`mn-${v}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={SKY}
                strokeOpacity={0.35}
                strokeWidth={1}
              />
            );
          })}

          {/* Major ticks (inside dial) + numeric labels (outside dial) */}
          {MAJOR_TICKS.map((v) => {
            const a = gaugeAngleDeg(v);
            const p1 = polar(CX, CY, R_TICK_OUT, a);
            const p2 = polar(CX, CY, R_TICK_MAJOR_IN, a);
            const lp = polar(CX, CY, R_LABEL, a);
            return (
              <g key={`mj-${v}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={SKY}
                  strokeWidth={2.2}
                />
                <text
                  x={lp.x}
                  y={lp.y + 7}
                  textAnchor="middle"
                  fontFamily={inter}
                  fontWeight={600}
                  fontSize={22}
                  fill={SKY}
                  letterSpacing={1}
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Peregrine silhouette, STOOPING — beak-down dart.
              Local frame: y increases toward beak. Tail tip at y≈-40,
              beak at y≈+288. Body ≈ 330 px tall at scale 1. */}
          <g
            transform={`translate(${falconX}, ${falconY}) scale(${falconScale})`}
          >
            {/* soft glow halo around body */}
            <circle cx={0} cy={130} r={220} fill="url(#falcon-glow)" />

            {/* Main body silhouette — vertical dart, head at BOTTOM.
                Wider shoulders at mid-body for a true raptor shape; wings
                are implied by the shoulder bulge, not drawn as fingers. */}
            <path
              d="M 0 288
                 C 14 286, 24 280, 32 270
                 C 42 256, 50 240, 54 220
                 C 60 190, 58 158, 52 128
                 C 46 100, 38 72, 28 46
                 C 20 24, 12 2, 6 -22
                 C 4 -32, -4 -32, -6 -22
                 C -12 2, -20 24, -28 46
                 C -38 72, -46 100, -52 128
                 C -58 158, -60 190, -54 220
                 C -50 240, -42 256, -32 270
                 C -24 280, -14 286, 0 288 Z"
              fill={SLATE}
            />

            {/* Subtle wing-shoulder shading on each flank — darker slate
                reads as the folded wing against the body, with no fingers. */}
            <path
              d="M -52 128
                 C -58 108, -56 80, -46 56
                 C -42 86, -42 108, -40 134 Z"
              fill={SLATE_DK}
              opacity={0.92}
            />
            <path
              d="M 52 128
                 C 58 108, 56 80, 46 56
                 C 42 86, 42 108, 40 134 Z"
              fill={SLATE_DK}
              opacity={0.92}
            />

            {/* Buff ventral belly — narrower than before, reads as a stripe
                inside the slate body, not a flame covering it. */}
            <path
              d="M 0 262
                 C 10 260, 12 220, 10 170
                 C 8 120, 6 70, 2 24
                 C 1 14, -1 14, -2 24
                 C -6 70, -8 120, -10 170
                 C -12 220, -10 260, 0 262 Z"
              fill={BUFF}
            />

            {/* Chestnut horizontal bars inside the buff region */}
            {Array.from({ length: 16 }, (_, i) => 44 + i * 12).map((y) => {
              const dCenter = Math.abs(y - 150);
              const half = Math.max(2.5, 10 - dCenter * 0.045);
              return (
                <rect
                  key={`bar-${y}`}
                  x={-half}
                  y={y}
                  width={half * 2}
                  height={2.2}
                  fill={RUST}
                  opacity={0.72}
                />
              );
            })}

            {/* Head cap — slate hood at the bottom (bird's head points down) */}
            <path
              d="M -24 262
                 C -24 278, -16 288, 0 288
                 C 16 288, 24 278, 24 262
                 C 16 248, -16 248, -24 262 Z"
              fill={SLATE_DK}
            />

            {/* Signature black "moustache" cheek streaks (the peregrine's
                mask) — one on each cheek, below the eye, pointing down. */}
            <path
              d="M -8 274 C -12 262, -12 254, -8 250 L -4 262 Z"
              fill={SLATE_DK}
            />
            <path
              d="M 8 274 C 12 262, 12 254, 8 250 L 4 262 Z"
              fill={SLATE_DK}
            />

            {/* Eyes — small dark pupils with a narrow buff rim.
                Peregrines have mostly black eyes with a thin yellow ring. */}
            <circle cx={-10} cy={256} r={2.6} fill={INK} />
            <circle cx={10} cy={256} r={2.6} fill={INK} />
            <circle
              cx={-10}
              cy={256}
              r={2.6}
              fill="none"
              stroke={BUFF}
              strokeWidth={0.9}
            />
            <circle
              cx={10}
              cy={256}
              r={2.6}
              fill="none"
              stroke={BUFF}
              strokeWidth={0.9}
            />

            {/* Beak — a single clean hooked wedge pointing DOWN below the head */}
            <path d="M -5 278 L 0 292 L 5 278 Z" fill={BUFF} />
            <path d="M -2 288 Q 0 296 2 288 Z" fill={INK} opacity={0.85} />
          </g>

          {/* ─── Needle on top ─── */}
          <g>
            {(() => {
              const tip = polar(CX, CY, R_TICK_MAJOR_IN - 10, needleAngle);
              const tail = polar(CX, CY, 44, needleAngle + 180);
              const perp1 = polar(CX, CY, 7, needleAngle + 90);
              const perp2 = polar(CX, CY, 7, needleAngle - 90);
              return (
                <polygon
                  points={`${tip.x},${tip.y} ${perp1.x},${perp1.y} ${tail.x},${tail.y} ${perp2.x},${perp2.y}`}
                  fill={RUST}
                  stroke={BUFF}
                  strokeWidth={0.6}
                  opacity={0.98}
                />
              );
            })()}
            <circle cx={CX} cy={CY} r={18} fill={SLATE_HI} />
            <circle
              cx={CX}
              cy={CY}
              r={18}
              fill="none"
              stroke={BUFF}
              strokeWidth={1.2}
            />
            <circle cx={CX} cy={CY} r={6} fill={BUFF} />
          </g>

          {/* ─── Digital readout, well below the hub ─── */}
          <g>
            <rect
              x={CX - 110}
              y={CY + 196}
              width={220}
              height={54}
              rx={2}
              fill={INK}
              stroke={SLATE_HI}
              strokeWidth={1}
            />
            <text
              x={CX}
              y={CY + 234}
              textAnchor="middle"
              fontFamily={inter}
              fontSize={34}
              fontWeight={600}
              fill={BUFF}
              letterSpacing={3}
            >
              {String(Math.round(needleValue)).padStart(3, "0")} KM/H
            </text>
          </g>
        </g>

        {/* ─── Technical inset — nasal tubercle, lower-left of frame ─── */}
        <g transform={`translate(${FRAME.x + 36}, ${FRAME.y + FRAME.h - 232})`}>
          <rect
            x={0}
            y={0}
            width={288}
            height={204}
            fill={INK}
            stroke={SLATE_HI}
            strokeWidth={1}
          />
          <text
            x={16}
            y={26}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={4}
            fill={GRAY}
          >
            FIG. 2 · NASAL TUBERCLE
          </text>
          {/* Enlarged section of nostril */}
          <g transform="translate(44, 54)">
            {/* nostril outer wall (cross-section) */}
            <path
              d="M -10 70 L -10 110 L 210 110 L 210 70
                 C 190 10, 10 10, -10 70 Z"
              fill={SLATE}
              opacity={0.95}
            />
            {/* nostril interior opening (deep black cavity) */}
            <path
              d="M 10 72 C 20 36, 180 36, 190 72 L 200 102 L 0 102 Z"
              fill={INK}
            />
            {/* tubercle cone standing in the middle of the nostril */}
            <path
              d="M 86 46 L 114 46 L 100 102 Z"
              fill={BUFF}
              stroke={RUST}
              strokeWidth={1.4}
            />
            {/* The incoming air arrow (big, central) */}
            <line
              x1={100}
              y1={0}
              x2={100}
              y2={34}
              stroke={SKY}
              strokeWidth={1.6}
              markerEnd="url(#afarr)"
            />
            {/* The split airflow arcs around the tubercle */}
            <path
              d="M 100 10 C 70 30, 48 44, 24 60"
              stroke={SKY}
              strokeOpacity={0.8}
              strokeWidth={1.2}
              fill="none"
              strokeDasharray="4 3"
              markerEnd="url(#afarr)"
            />
            <path
              d="M 100 10 C 130 30, 152 44, 176 60"
              stroke={SKY}
              strokeOpacity={0.8}
              strokeWidth={1.2}
              fill="none"
              strokeDasharray="4 3"
              markerEnd="url(#afarr)"
            />
            {/* Dimension line callout under tubercle */}
            <line
              x1={86}
              y1={122}
              x2={114}
              y2={122}
              stroke={BUFF}
              strokeWidth={1}
            />
            <line x1={86} y1={118} x2={86} y2={126} stroke={BUFF} strokeWidth={1} />
            <line
              x1={114}
              y1={118}
              x2={114}
              y2={126}
              stroke={BUFF}
              strokeWidth={1}
            />
            <text
              x={100}
              y={140}
              textAnchor="middle"
              fontFamily={inter}
              fontSize={11}
              fontWeight={500}
              fill={BUFF}
              letterSpacing={2}
            >
              ≈ 4 MM
            </text>
            {/* Label the baffle */}
            <text
              x={132}
              y={78}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              fill={GRAY}
              letterSpacing={2.5}
            >
              BAFFLE
            </text>
          </g>
        </g>

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · HUNTING STOOP · TERMINAL AIRSPEED</text>
          <text x={FRAME.w} textAnchor="end" fill={BUFF} opacity={0.9}>
            FALCO PEREGRINUS · ANATUM
          </text>
        </g>
      </svg>

      {/* ── Type lockup ──────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 920,
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
            color: BUFF,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Fighter Pilot
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The 390-km/h
          <br />
          test pilot.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          In its hunting stoop the peregrine folds into a teardrop and tops{" "}
          <span style={{ color: BUFF, fontWeight: 600 }}>320 km/h</span> —
          tiny bony cones in each nostril split the oncoming air so the bird
          can keep breathing against the ram pressure, the same inlet-cone
          geometry jets use at supersonic speeds.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 46,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Ponitz et al. · PLOS ONE 9 (2014) e86506</span>
        <span>
          <span style={{ color: RUST }}>●</span> Needle = Stoop Airspeed
        </span>
      </div>
    </AbsoluteFill>
  );
};
