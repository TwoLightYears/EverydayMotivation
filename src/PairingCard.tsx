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

// Palette — drawn from the bombardier beetle's real coloration and hot quinone spray
const INK = "#0D1116";
const BOARD = "#12171C";
const ELYTRA = "#1F3F2D";
const ELYTRA_HI = "#2E5A40";
const VERMILION = "#E5451F";
const QUINONE = "#F0D048";
const QUINONE_HOT = "#FDE58A";
const CREAM = "#EFE9D8";
const CREAM_DIM = "#8C8778";
const GRID = "#171C21";
const GRID_MAJOR = "#212830";

// ─── SVG map (drafting-plate coord space: 1080 × 800) ─────────────────
// The abdomen cutaway is the hero. It reads as a two-stage chemical reactor:
// reservoir → valve → reaction chamber → nozzle.
//   Reservoir centre : x=280, y=490
//   Valve            : x=440, y=490
//   Reaction chamber : x=620, y=490
//   Nozzle throat    : x=752, y=490
//   Nozzle exit      : x=800, y=490

const RES_C = { x: 280, y: 490 };
const RC_C = { x: 620, y: 490 };
const NOZZLE_EXIT = { x: 800, y: 490 };

// Oscilloscope panel (top of plate)
const OSC = { x: 80, y: 58, w: 920, h: 108 };

// ─── Helpers ─────────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);

// Pulse train: a square-ish envelope sampled along the oscilloscope panel.
// Visually reads as ~5 pulses across the width — labelled as "500 Hz".
const pulseAt = (u: number): number => {
  // u in [0,1] along osc width. 6 pulses across, each with a fast rise/fall.
  const cycles = 6;
  const phase = (u * cycles) % 1;
  // narrow gaussian pulse
  const g = Math.exp(-Math.pow((phase - 0.35) / 0.11, 2));
  return g;
};

// Puff positions along the nozzle exit — spaced along the throw.
const PUFF_COUNT = 10;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Timing phases (seconds)
  //   0.0  build small beetle icon
  //   0.3  cutaway outline
  //   0.6  reservoir fills
  //   0.9  valve appears
  //   1.1  reaction chamber ignites
  //   1.4  nozzle spray starts, oscilloscope traces
  //   2.0  type lockup springs in

  const cutOutT = easeOut((frame - fps * 0.25) / (fps * 0.5));
  const resFillT = easeOut((frame - fps * 0.55) / (fps * 0.7));
  const valveT = easeOut((frame - fps * 0.9) / (fps * 0.3));
  const rcIgniteT = easeOut((frame - fps * 1.1) / (fps * 0.5));
  const sprayT = easeOut((frame - fps * 1.45) / (fps * 0.6));

  const titleSpring = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 1.2, fps * 2.1],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Oscilloscope sweep — a marker travels along the trace
  const oscSweep = (frame % (fps * 3.2)) / (fps * 3.2);

  // Layout: drafting frame area on the page
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
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
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: CREAM_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: VERMILION }}>2026 · 09 · 22</span>
      </div>

      {/* Drafting frame with the technical illustration */}
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

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#161B22" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="hot-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={QUINONE_HOT} stopOpacity={0.9} />
            <stop offset="55%" stopColor={QUINONE} stopOpacity={0.4} />
            <stop offset="100%" stopColor={VERMILION} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="res-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F7ECD1" stopOpacity={0.9} />
            <stop offset="100%" stopColor={CREAM} stopOpacity={0.45} />
          </radialGradient>

          <linearGradient id="chamber-hot" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={VERMILION} stopOpacity={0.9} />
            <stop offset="60%" stopColor={QUINONE} stopOpacity={0.95} />
            <stop offset="100%" stopColor={QUINONE_HOT} stopOpacity={1} />
          </linearGradient>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="hot-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
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
          <g key={i} stroke={VERMILION} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate title strip inside the frame — top-left */}
        <g
          transform={`translate(${FRAME.x + 22}, ${FRAME.y + 28})`}
          fill={CREAM_DIM}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
        >
          <text>PLATE III · BIOLOGICAL PULSE-JET</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 22}, ${FRAME.y + 28})`}
          fill={CREAM_DIM}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
          textAnchor="end"
        >
          <text>SUBJECT · BRACHINUS SP.</text>
        </g>

        {/* ─── Map content, mapped into the plate ───────────────── */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          {/* ==== Oscilloscope panel (top) ==== */}
          <g opacity={easeOut((frame - fps * 1.35) / (fps * 0.6))}>
            {/* Frame */}
            <rect
              x={OSC.x}
              y={OSC.y}
              width={OSC.w}
              height={OSC.h}
              fill="#0B0F13"
              stroke="#2A313A"
              strokeWidth={1}
              rx={4}
            />
            {/* Faint grid */}
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={`ogv-${i}`}
                x1={OSC.x + (OSC.w * i) / 10}
                y1={OSC.y}
                x2={OSC.x + (OSC.w * i) / 10}
                y2={OSC.y + OSC.h}
                stroke="#141B21"
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={`ogh-${i}`}
                x1={OSC.x}
                y1={OSC.y + (OSC.h * i) / 4}
                x2={OSC.x + OSC.w}
                y2={OSC.y + (OSC.h * i) / 4}
                stroke="#141B21"
                strokeWidth={1}
              />
            ))}
            {/* Zero line */}
            <line
              x1={OSC.x}
              y1={OSC.y + OSC.h - 26}
              x2={OSC.x + OSC.w}
              y2={OSC.y + OSC.h - 26}
              stroke={CREAM_DIM}
              strokeWidth={1}
              strokeDasharray="4 6"
              opacity={0.35}
            />
            {/* Trace */}
            {(() => {
              const N = 260;
              const baseY = OSC.y + OSC.h - 26;
              const amp = OSC.h - 40;
              let d = "";
              const drawTo = Math.min(1, oscSweep);
              for (let i = 0; i <= N; i++) {
                const u = i / N;
                if (u > drawTo) break;
                const x = OSC.x + u * OSC.w;
                const y = baseY - pulseAt(u) * amp;
                d += (i === 0 ? "M " : "L ") + x.toFixed(1) + " " + y.toFixed(1) + " ";
              }
              return (
                <>
                  <path
                    d={d}
                    stroke={QUINONE}
                    strokeWidth={2.2}
                    fill="none"
                    filter="url(#soft-glow)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={d}
                    stroke={QUINONE_HOT}
                    strokeWidth={1}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.9}
                  />
                </>
              );
            })()}
            {/* Sweep marker — just the trace dot, no full-height line */}
            {(() => {
              const mx = OSC.x + oscSweep * OSC.w;
              const my =
                OSC.y + OSC.h - 26 - pulseAt(oscSweep) * (OSC.h - 40);
              return (
                <g>
                  <line
                    x1={mx}
                    y1={OSC.y + OSC.h - 32}
                    x2={mx}
                    y2={OSC.y + OSC.h - 8}
                    stroke={VERMILION}
                    strokeWidth={1}
                    opacity={0.35}
                  />
                  <circle cx={mx} cy={my} r={4} fill={QUINONE_HOT} />
                </g>
              );
            })()}
            {/* Labels */}
            <text
              x={OSC.x + 14}
              y={OSC.y + 24}
              fill={CREAM}
              fontFamily={inter}
              fontSize={12}
              fontWeight={600}
              letterSpacing={3}
            >
              PRESSURE · P(t)
            </text>
            <text
              x={OSC.x + OSC.w - 14}
              y={OSC.y + 24}
              fill={QUINONE}
              fontFamily={inter}
              fontSize={12}
              fontWeight={600}
              letterSpacing={3}
              textAnchor="end"
            >
              PULSE · 500 Hz
            </text>
            <text
              x={OSC.x + 14}
              y={OSC.y + OSC.h - 10}
              fill={CREAM_DIM}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.5}
              fontWeight={500}
            >
              t / 2 ms per division
            </text>
          </g>

          {/* ==== Abdomen cutaway (hero) ==== */}
          <AbdomenCutaway
            cutOutT={cutOutT}
            resFillT={resFillT}
            valveT={valveT}
            rcIgniteT={rcIgniteT}
          />

          {/* ==== Pulsed spray from nozzle ==== */}
          <g opacity={sprayT}>
            {/* Hot halo at nozzle */}
            <circle
              cx={NOZZLE_EXIT.x + 2}
              cy={NOZZLE_EXIT.y}
              r={20 + Math.sin(frame * 0.9) * 3}
              fill="url(#hot-glow)"
            />
            {/* Puffs — staccato, kept small so they read as discrete pulses */}
            {Array.from({ length: PUFF_COUNT }).map((_, i) => {
              const cycleLen = fps * 1.6;
              const offset = (i / PUFF_COUNT) * cycleLen;
              const localFrame =
                (frame - fps * 1.45 + offset) % cycleLen;
              if (localFrame < 0) return null;
              const life = localFrame / cycleLen;
              const throw_ = 220;
              const px = NOZZLE_EXIT.x + 12 + life * throw_;
              const jitter =
                Math.sin((i * 7 + frame * 0.3) * 0.5) * 4 * life;
              const py = NOZZLE_EXIT.y + jitter;
              // Small tight core with a soft halo — visible as a "bullet"
              const r = 4 + life * 12;
              const halo = r + 6;
              const op = (1 - life) * 0.9;
              return (
                <g key={i}>
                  <circle
                    cx={px}
                    cy={py}
                    r={halo}
                    fill={QUINONE}
                    opacity={op * 0.4}
                    filter="url(#hot-blur)"
                  />
                  <circle
                    cx={px}
                    cy={py}
                    r={r}
                    fill={QUINONE_HOT}
                    opacity={op * 0.85}
                  />
                  <circle
                    cx={px}
                    cy={py}
                    r={Math.max(1.5, r * 0.4)}
                    fill="#FFFFFF"
                    opacity={op}
                  />
                </g>
              );
            })}
            {/* Steam wisps */}
            {Array.from({ length: 5 }).map((_, i) => {
              const cycleLen = fps * 2.4;
              const offset = (i / 5) * cycleLen;
              const localFrame =
                (frame - fps * 1.7 + offset) % cycleLen;
              if (localFrame < 0) return null;
              const life = localFrame / cycleLen;
              const px = NOZZLE_EXIT.x + 40 + life * 220;
              const py = NOZZLE_EXIT.y - 40 - life * 30 + i * 3;
              const r = 10 + life * 22;
              const op = (1 - life) * 0.28;
              return (
                <circle
                  key={`s-${i}`}
                  cx={px}
                  cy={py}
                  r={r}
                  fill={CREAM}
                  opacity={op}
                  filter="url(#hot-blur)"
                />
              );
            })}
          </g>

          {/* ==== Callout labels on the cutaway ==== */}
          <g opacity={easeOut((frame - fps * 0.9) / (fps * 0.7))}>
            {/* RESERVOIR — above-left */}
            <line
              x1={RES_C.x}
              y1={RES_C.y - 96}
              x2={RES_C.x}
              y2={266}
              stroke={CREAM_DIM}
              strokeWidth={1}
            />
            <line
              x1={RES_C.x}
              y1={266}
              x2={120}
              y2={266}
              stroke={CREAM_DIM}
              strokeWidth={1}
            />
            <text
              x={120}
              y={258}
              fill={CREAM}
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={3.6}
            >
              RESERVOIR
            </text>
            <text
              x={120}
              y={280}
              fill={CREAM_DIM}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={1.8}
              fontWeight={500}
            >
              hydroquinones + H₂O₂
            </text>

            {/* REACTION CHAMBER — above-right */}
            <line
              x1={RC_C.x}
              y1={RC_C.y - 96}
              x2={RC_C.x}
              y2={266}
              stroke={CREAM_DIM}
              strokeWidth={1}
            />
            <line
              x1={RC_C.x}
              y1={266}
              x2={960}
              y2={266}
              stroke={CREAM_DIM}
              strokeWidth={1}
            />
            <text
              x={960}
              y={258}
              fill={QUINONE}
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={3.6}
              textAnchor="end"
            >
              REACTION CHAMBER
            </text>
            <text
              x={960}
              y={280}
              fill={CREAM_DIM}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={1.8}
              fontWeight={500}
              textAnchor="end"
            >
              catalase + peroxidase · ~100 °C
            </text>

            {/* VALVE — below-left */}
            <line
              x1={440}
              y1={568}
              x2={440}
              y2={638}
              stroke={CREAM_DIM}
              strokeWidth={1}
            />
            <line
              x1={440}
              y1={638}
              x2={310}
              y2={638}
              stroke={CREAM_DIM}
              strokeWidth={1}
            />
            <text
              x={310}
              y={632}
              fill={CREAM}
              fontFamily={inter}
              fontSize={12}
              fontWeight={600}
              letterSpacing={3.2}
              textAnchor="end"
            >
              ONE-WAY VALVE
            </text>
            <text
              x={310}
              y={652}
              fill={CREAM_DIM}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2}
              fontWeight={500}
              textAnchor="end"
            >
              vestibule seal, opens on discharge
            </text>

            {/* NOZZLE — below-right */}
            <line
              x1={NOZZLE_EXIT.x - 8}
              y1={NOZZLE_EXIT.y + 40}
              x2={NOZZLE_EXIT.x - 8}
              y2={678}
              stroke={CREAM_DIM}
              strokeWidth={1}
            />
            <line
              x1={NOZZLE_EXIT.x - 8}
              y1={678}
              x2={960}
              y2={678}
              stroke={CREAM_DIM}
              strokeWidth={1}
            />
            <text
              x={960}
              y={672}
              fill={CREAM}
              fontFamily={inter}
              fontSize={12}
              fontWeight={600}
              letterSpacing={3.2}
              textAnchor="end"
            >
              REVOLVING NOZZLE
            </text>
            <text
              x={960}
              y={692}
              fill={CREAM_DIM}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2}
              fontWeight={500}
              textAnchor="end"
            >
              swivels ±180°, aimed by the beetle
            </text>
          </g>

          {/* Frequency legend inside the puff column */}
          <g opacity={sprayT}>
            {/* Dimension bracket under the puff column */}
            <line
              x1={NOZZLE_EXIT.x + 10}
              y1={NOZZLE_EXIT.y + 52}
              x2={NOZZLE_EXIT.x + 220}
              y2={NOZZLE_EXIT.y + 52}
              stroke={QUINONE}
              strokeWidth={1.2}
              opacity={0.75}
            />
            <line
              x1={NOZZLE_EXIT.x + 10}
              y1={NOZZLE_EXIT.y + 46}
              x2={NOZZLE_EXIT.x + 10}
              y2={NOZZLE_EXIT.y + 58}
              stroke={QUINONE}
              strokeWidth={1.2}
              opacity={0.75}
            />
            <line
              x1={NOZZLE_EXIT.x + 220}
              y1={NOZZLE_EXIT.y + 46}
              x2={NOZZLE_EXIT.x + 220}
              y2={NOZZLE_EXIT.y + 58}
              stroke={QUINONE}
              strokeWidth={1.2}
              opacity={0.75}
            />
            <text
              x={NOZZLE_EXIT.x + 115}
              y={NOZZLE_EXIT.y + 76}
              fill={QUINONE}
              fontFamily={inter}
              fontSize={18}
              fontWeight={700}
              letterSpacing={2}
              textAnchor="middle"
            >
              500 Hz
            </text>
          </g>

          {/* Bottom caption strip within plate */}
          <g
            transform={`translate(0, 754)`}
            fill={CREAM_DIM}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.6}
            fontWeight={500}
          >
            <text x={80}>FIG. B · ABDOMINAL REACTION APPARATUS · CROSS-SECTION</text>
            <text x={1000} textAnchor="end" fill={VERMILION} opacity={0.85}>
              EJECTION VELOCITY · 10 m/s
            </text>
          </g>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
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
            color: QUINONE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: CREAM_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Chemical Engineer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The five-hundred-hertz
          <br />
          chemist.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          A{" "}
          <span style={{ color: VERMILION, fontWeight: 600 }}>
            bombardier beetle
          </span>{" "}
          runs a two-chamber reactor in its abdomen — hydroquinones and
          hydrogen peroxide flashed with catalase to{" "}
          <span style={{ color: QUINONE, fontWeight: 600 }}>~100&nbsp;°C</span>{" "}
          and expelled in a pulse-jet at ~500 Hz. Its own body is the pressure
          vessel, and it never blows up.
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
          color: CREAM_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Dean et al. · Science 248 (1990) 1219–1221</span>
        <span>
          <span style={{ color: QUINONE }}>●</span> Benzoquinone pulse
        </span>
      </div>

      {/* keep the composition running the full duration */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};

// ─── Hero abdomen cutaway ────────────────────────────────────────────
const AbdomenCutaway: React.FC<{
  cutOutT: number;
  resFillT: number;
  valveT: number;
  rcIgniteT: number;
}> = ({ cutOutT, resFillT, valveT, rcIgniteT }) => {
  // Abdomen envelope: a rounded teardrop pointing right.
  // We build it from two chamber circles joined by a smooth waist + nozzle.
  //
  //  reservoir (left) : cx=280, cy=490, rx=140, ry=90
  //  reaction chamber : cx=620, cy=490, rx=130, ry=80
  //  nozzle           : x = 750..800, tapering
  const envelope = `
    M 140 490
    C 140 400, 200 400, 280 400
    L 500 400
    Q 490 480, 500 480
    L 490 490
    L 500 500
    Q 490 500, 500 580
    L 280 580
    C 200 580, 140 580, 140 490
    Z
  `;

  // Envelope trace uses stroke-dasharray to draw the outline in.
  const envLen = 1300; // approx

  return (
    <g>
      {/* Envelope fill (very subtle base — the abdomen shape) */}
      <path
        d={`
          M 140 490
          C 140 400, 200 400, 280 400
          L 620 400
          Q 720 400, 748 470
          L 800 486
          L 800 494
          L 748 510
          Q 720 580, 620 580
          L 280 580
          C 200 580, 140 580, 140 490
          Z
        `}
        fill="#131A20"
        stroke="none"
        opacity={cutOutT * 0.85}
      />
      {/* Envelope outline */}
      <path
        d={`
          M 140 490
          C 140 400, 200 400, 280 400
          L 620 400
          Q 720 400, 748 470
          L 800 486
          L 800 494
          L 748 510
          Q 720 580, 620 580
          L 280 580
          C 200 580, 140 580, 140 490
          Z
        `}
        fill="none"
        stroke={CREAM}
        strokeWidth={2}
        strokeDasharray={envLen}
        strokeDashoffset={envLen * (1 - cutOutT)}
        strokeLinejoin="round"
      />

      {/* ==== Reservoir (left chamber) ==== */}
      <g opacity={cutOutT}>
        <ellipse
          cx={280}
          cy={490}
          rx={130}
          ry={78}
          fill="url(#res-fill)"
          opacity={0.4 * resFillT}
        />
        <ellipse
          cx={280}
          cy={490}
          rx={130}
          ry={78}
          fill="none"
          stroke={CREAM}
          strokeWidth={1.4}
          strokeDasharray="6 4"
          opacity={0.75}
        />
        {/* Hatch pattern of small circles suggesting liquid molecules */}
        {resFillT > 0.1 &&
          Array.from({ length: 22 }).map((_, i) => {
            const seed = (i * 37) % 100;
            const angle = (seed / 100) * Math.PI * 2;
            const r = 8 + (seed % 60);
            const x = 280 + Math.cos(angle) * r;
            const y = 490 + Math.sin(angle) * r * 0.55;
            const size = 3 + (seed % 3);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={size}
                fill={i % 3 === 0 ? VERMILION : CREAM}
                opacity={0.55 * resFillT}
              />
            );
          })}
      </g>

      {/* ==== Waist / one-way valve ==== */}
      <g opacity={valveT}>
        {/* Waist walls (thicker) */}
        <path
          d="M 410 448 Q 440 460 470 448 L 470 532 Q 440 520 410 532 Z"
          fill="#0F1519"
          stroke={CREAM}
          strokeWidth={1.6}
        />
        {/* Valve flap */}
        <path
          d="M 440 460 L 452 490 L 440 520"
          stroke={VERMILION}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
        />
        <circle cx={440} cy={460} r={2.6} fill={VERMILION} />
        <circle cx={440} cy={520} r={2.6} fill={VERMILION} />
      </g>

      {/* ==== Reaction chamber (right) ==== */}
      <g opacity={cutOutT}>
        {/* Thick reinforced wall */}
        <ellipse
          cx={620}
          cy={490}
          rx={120}
          ry={72}
          fill="none"
          stroke={CREAM}
          strokeWidth={3.2}
          opacity={0.85}
        />
        <ellipse
          cx={620}
          cy={490}
          rx={114}
          ry={66}
          fill="none"
          stroke={CREAM_DIM}
          strokeWidth={1}
          opacity={0.5}
        />
        {/* Hot fill */}
        <ellipse
          cx={620}
          cy={490}
          rx={110 * rcIgniteT}
          ry={62 * rcIgniteT}
          fill="url(#chamber-hot)"
          opacity={0.75 * rcIgniteT}
        />
        {/* Turbulent hot puff inside */}
        {rcIgniteT > 0.2 &&
          Array.from({ length: 14 }).map((_, i) => {
            const seed = (i * 53 + 7) % 100;
            const angle = (seed / 100) * Math.PI * 2;
            const r = 10 + (seed % 55);
            const x = 620 + Math.cos(angle) * r;
            const y = 490 + Math.sin(angle) * r * 0.55;
            const size = 4 + (seed % 4);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={size}
                fill={i % 2 === 0 ? QUINONE_HOT : "#FFFFFF"}
                opacity={0.7 * rcIgniteT}
              />
            );
          })}
      </g>

      {/* ==== Nozzle throat ==== */}
      <g opacity={cutOutT}>
        <path
          d="M 740 468 L 800 484 L 800 496 L 740 512 Z"
          fill="#0F1519"
          stroke={CREAM}
          strokeWidth={1.8}
        />
        <path
          d="M 745 482 L 795 486 L 795 494 L 745 498 Z"
          fill={rcIgniteT > 0.5 ? QUINONE : "#141B21"}
          opacity={rcIgniteT}
        />
      </g>

      {/* Ghost Roman-numeral watermarks inside each chamber */}
      <g opacity={cutOutT}>
        <text
          x={200}
          y={520}
          fill={CREAM}
          fontFamily={playfair}
          fontStyle="italic"
          fontSize={62}
          fontWeight={500}
          opacity={0.14}
        >
          I
        </text>
        <text
          x={555}
          y={520}
          fill={CREAM}
          fontFamily={playfair}
          fontStyle="italic"
          fontSize={62}
          fontWeight={500}
          opacity={0.14 + 0.10 * rcIgniteT}
        >
          II
        </text>
      </g>
    </g>
  );
};
