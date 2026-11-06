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

// Palette — taken from the concept's visual brief
const INK = "#060818";
const BOARD = "#141A35";
const BOARD_CORE = "#1A2144";
const BEAM = "#7FA5FF";
const HOT = "#EEF3FF";
const SHOCK = "#F06C4A";
const GRAY = "#8C93AE";
const GRID = "#1D2547";
const GRID_MAJOR = "#273058";

// ── Star field (deterministic) ────────────────────────────────────────────
type Star = { x: number; y: number; r: number; o: number; tw: number };
const rand = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const STARS: Star[] = (() => {
  const r = rand(0xa11ce);
  const out: Star[] = [];
  for (let i = 0; i < 120; i++) {
    out.push({
      x: r() * 960,
      y: r() * 1080,
      r: 0.5 + r() * 1.6,
      o: 0.25 + r() * 0.65,
      tw: r(),
    });
  }
  return out;
})();

// Wave fronts emitted by the pulsar (concentric arcs, pulsed outward)
const WAVE_COUNT = 6;

// Pulse-strip ticks (right margin inside the frame)
const TICK_COUNT = 24;

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const loopFrames = fps * 4; // 4-second visual loop for the rotation
  const rotT = (frame % loopFrames) / loopFrames; // 0..1
  const rotation = rotT * Math.PI * 2; // radians

  // Type-in entrances
  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const framePresence = interpolate(frame, [0, fps * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Art area within the 1080×1350 canvas
  const FRAME = { x: 60, y: 130, w: 960, h: 711 };
  // Pulsar coord space: 960 × 711 (same as frame)
  const CX = 420; // slightly left of centre (asymmetry)
  const CY = 330;

  // Rotation axis is vertical; magnetic axis tilted from it
  const AXIS_TILT = (18 * Math.PI) / 180; // 18° from rotation axis
  const BEAM_HALF_ANGLE = (8 * Math.PI) / 180; // narrow cone
  const BEAM_LENGTH = 520;

  // Each beam's current direction in-plane: rotation + fixed tilt from vertical
  const theta1 = rotation + AXIS_TILT - Math.PI / 2; // upper beam
  const theta2 = rotation + AXIS_TILT + Math.PI / 2; // lower beam (opposite)

  // Build a beam cone as a triangle path
  const beamPath = (theta: number): string => {
    const tipX = CX + Math.cos(theta) * BEAM_LENGTH;
    const tipY = CY + Math.sin(theta) * BEAM_LENGTH;
    const leftX = CX + Math.cos(theta - BEAM_HALF_ANGLE) * BEAM_LENGTH;
    const leftY = CY + Math.sin(theta - BEAM_HALF_ANGLE) * BEAM_LENGTH;
    const rightX = CX + Math.cos(theta + BEAM_HALF_ANGLE) * BEAM_LENGTH;
    const rightY = CY + Math.sin(theta + BEAM_HALF_ANGLE) * BEAM_LENGTH;
    return `M ${CX} ${CY} L ${leftX} ${leftY} L ${tipX} ${tipY} L ${rightX} ${rightY} Z`;
  };

  // "Flash" when a beam aligns toward the viewer (the right margin ≈ 0 rad)
  // We'll detect the normalized angle closeness to 0 or π
  const alignCloseness = (() => {
    const d1 = Math.min(
      Math.abs(((theta1 + Math.PI * 2) % (Math.PI * 2)) - 0),
      Math.abs(((theta1 + Math.PI * 2) % (Math.PI * 2)) - Math.PI * 2),
    );
    const d2 = Math.min(
      Math.abs(((theta2 + Math.PI * 2) % (Math.PI * 2)) - Math.PI),
      Math.abs(((theta2 + Math.PI * 2) % (Math.PI * 2)) - Math.PI * 2),
    );
    const d = Math.min(d1, d2);
    const sigma = 0.25;
    return Math.exp(-(d * d) / (2 * sigma * sigma));
  })();

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
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: BEAM }}>2026 · 11 · 06</span>
      </div>

      {/* Main SVG: drafting frame + pulsar */}
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
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 48 0 L 0 0 0 48`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={192}
            height={192}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 192 0 L 0 0 0 192`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="38%" cy="46%" r="75%">
            <stop offset="0%" stopColor={BOARD_CORE} />
            <stop offset="100%" stopColor={BOARD} />
          </radialGradient>

          <radialGradient id="star-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HOT} stopOpacity={1} />
            <stop offset="55%" stopColor={BEAM} stopOpacity={0.9} />
            <stop offset="100%" stopColor={BEAM} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="star-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HOT} stopOpacity={0.55} />
            <stop offset="100%" stopColor={BEAM} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="beam-grad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={HOT} stopOpacity={0.92} />
            <stop offset="35%" stopColor={BEAM} stopOpacity={0.55} />
            <stop offset="100%" stopColor={BEAM} stopOpacity={0} />
          </linearGradient>

          <filter id="softglow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="starglow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          <clipPath id="frame-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>
        </defs>

        {/* Drafting board */}
        <g opacity={framePresence}>
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
            stroke="#2A335C"
            strokeWidth={1}
          />
        </g>

        {/* Corner crop marks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={SHOCK} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Chart-table label */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.5}
        >
          <text textAnchor="start">CHART · EPOCH J2000</text>
        </g>
        <g
          transform={`translate(${FRAME.x + 360}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.5}
        >
          <text textAnchor="start">RA 19ʰ 39ᵐ · DEC +21° 34′</text>
        </g>

        {/* Pulsar scene — clipped to frame */}
        <g clipPath="url(#frame-clip)">
          <g transform={`translate(${FRAME.x}, ${FRAME.y})`}>
            {/* Star field */}
            {STARS.map((s, i) => {
              const tw =
                0.7 +
                0.3 *
                  Math.sin(
                    (frame / fps) * (1.2 + s.tw * 1.4) + s.tw * 6.283,
                  );
              return (
                <circle
                  key={`st-${i}`}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill={HOT}
                  opacity={s.o * tw * framePresence}
                />
              );
            })}

            {/* Rotation axis guide (vertical dashed) */}
            <line
              x1={CX}
              y1={CY - 280}
              x2={CX}
              y2={CY + 280}
              stroke={GRID_MAJOR}
              strokeWidth={1}
              strokeDasharray="2 6"
              opacity={0.7 * framePresence}
            />

            {/* Magnetic axis guide (tilted dashed) */}
            <line
              x1={CX - Math.sin(AXIS_TILT) * 280}
              y1={CY + Math.cos(AXIS_TILT) * 280}
              x2={CX + Math.sin(AXIS_TILT) * 280}
              y2={CY - Math.cos(AXIS_TILT) * 280}
              stroke={SHOCK}
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="3 6"
              opacity={framePresence}
            />

            {/* Wavefronts — expanding arcs from the star (represent emitted radiation) */}
            {Array.from({ length: WAVE_COUNT }).map((_, i) => {
              const phase = ((rotT + i / WAVE_COUNT) % 1);
              const r = 40 + phase * 460;
              const op =
                (1 - phase) * 0.55 * framePresence * (0.6 + alignCloseness * 0.9);
              return (
                <circle
                  key={`w-${i}`}
                  cx={CX}
                  cy={CY}
                  r={r}
                  fill="none"
                  stroke={BEAM}
                  strokeWidth={1.4}
                  opacity={op}
                />
              );
            })}

            {/* Beam cones — rotating pair */}
            <g filter="url(#softglow)" opacity={framePresence}>
              <path d={beamPath(theta1)} fill="url(#beam-grad)" opacity={0.85} />
              <path d={beamPath(theta2)} fill="url(#beam-grad)" opacity={0.85} />
            </g>

            {/* Beam core lines — crisp central ray each beam */}
            <g opacity={framePresence}>
              <line
                x1={CX}
                y1={CY}
                x2={CX + Math.cos(theta1) * BEAM_LENGTH}
                y2={CY + Math.sin(theta1) * BEAM_LENGTH}
                stroke={HOT}
                strokeWidth={1.4}
                strokeOpacity={0.9}
              />
              <line
                x1={CX}
                y1={CY}
                x2={CX + Math.cos(theta2) * BEAM_LENGTH}
                y2={CY + Math.sin(theta2) * BEAM_LENGTH}
                stroke={HOT}
                strokeWidth={1.4}
                strokeOpacity={0.9}
              />
            </g>

            {/* The neutron star itself */}
            <g opacity={framePresence}>
              <circle
                cx={CX}
                cy={CY}
                r={90}
                fill="url(#star-halo)"
                opacity={0.55 + alignCloseness * 0.45}
              />
              <circle
                cx={CX}
                cy={CY}
                r={32}
                fill="url(#star-core)"
                opacity={1}
              />
              <circle
                cx={CX}
                cy={CY}
                r={9}
                fill={HOT}
              />
            </g>

            {/* Callout line to the pulsar */}
            <g opacity={framePresence}>
              <line
                x1={CX + 18}
                y1={CY - 16}
                x2={CX + 120}
                y2={CY - 110}
                stroke={SHOCK}
                strokeWidth={1.2}
              />
              <line
                x1={CX + 120}
                y1={CY - 110}
                x2={CX + 220}
                y2={CY - 110}
                stroke={SHOCK}
                strokeWidth={1.2}
              />
              <rect
                x={CX + 218}
                y={CY - 122}
                width={166}
                height={24}
                rx={2}
                fill={INK}
                stroke={SHOCK}
                strokeWidth={1.2}
              />
              <text
                x={CX + 301}
                y={CY - 106}
                textAnchor="middle"
                fill={SHOCK}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3.5}
              >
                PSR B1937+21
              </text>
            </g>

            {/* Period callout — leader to upper-left space */}
            <g opacity={framePresence}>
              <line
                x1={CX - 24}
                y1={CY + 18}
                x2={CX - 140}
                y2={CY + 160}
                stroke={BEAM}
                strokeWidth={1.2}
                strokeOpacity={0.9}
              />
              <line
                x1={CX - 140}
                y1={CY + 160}
                x2={CX - 260}
                y2={CY + 160}
                stroke={BEAM}
                strokeWidth={1.2}
                strokeOpacity={0.9}
              />
              <text
                x={CX - 266}
                y={CY + 150}
                textAnchor="end"
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={3}
                fontWeight={500}
              >
                PERIOD
              </text>
              <text
                x={CX - 266}
                y={CY + 176}
                textAnchor="end"
                fill={HOT}
                fontFamily={playfair}
                fontStyle="italic"
                fontSize={28}
                fontWeight={500}
              >
                1.5578 ms
              </text>
              <text
                x={CX - 266}
                y={CY + 200}
                textAnchor="end"
                fill={BEAM}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={3}
                fontWeight={500}
              >
                f = 642 Hz
              </text>
            </g>

            {/* Timing strip along the right margin inside the art area */}
            <g transform={`translate(810, 70)`} opacity={framePresence}>
              <text
                x={0}
                y={-16}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={3}
                fontWeight={500}
              >
                PULSE TRAIN
              </text>
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={TICK_COUNT * 23}
                stroke={GRID_MAJOR}
                strokeWidth={1}
              />
              {Array.from({ length: TICK_COUNT }).map((_, i) => {
                // Light each tick in sequence tied to the rotation, so the eye can "count time"
                const localPhase = (rotT * TICK_COUNT) % TICK_COUNT;
                const d = Math.abs(i - localPhase);
                const active = Math.max(0, 1 - d / 1.4);
                const long = i % 5 === 0;
                return (
                  <g key={`tick-${i}`}>
                    <line
                      x1={0}
                      y1={i * 23 + 12}
                      x2={long ? 22 : 14}
                      y2={i * 23 + 12}
                      stroke={active > 0.4 ? HOT : BEAM}
                      strokeOpacity={0.35 + active * 0.65}
                      strokeWidth={long ? 1.6 : 1.2}
                    />
                    {long && (
                      <text
                        x={28}
                        y={i * 23 + 16}
                        fill={GRAY}
                        fontFamily={inter}
                        fontSize={9}
                        letterSpacing={2}
                        fontWeight={500}
                        opacity={0.75}
                      >
                        {(i * 1.5578).toFixed(1)} ms
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
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
          <text>FIG. 1 · PSR B1937+21 · MAGNETIC BEAM SWEEP</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={BEAM}
            opacity={0.9}
          >
            STABILITY ≈ 1 PART IN 10¹⁴
          </text>
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
            color: BEAM,
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
            Lighthouse Keeper
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
          The lighthouse
          <br />
          that keeps time.
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
          Spinning <span style={{ color: BEAM, fontWeight: 600 }}>642 times a second</span>
          , the millisecond pulsar{" "}
          <span style={{ color: HOT, fontWeight: 600 }}>PSR B1937+21</span>{" "}
          sweeps its radio beam past Earth every 1.5578 milliseconds —
          and keeps that cadence to better than one part in 10¹⁴,
          a timekeeper that rivals the atomic clocks on the ground below.
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
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Backer et al. · Nature 300 (1982) 615–618</span>
        <span>
          <span style={{ color: SHOCK }}>●</span> 1 Tick = 1.5578 ms
        </span>
      </div>

      {/* Avoid unused-variable warnings */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
