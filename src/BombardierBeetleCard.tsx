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

// Palette — from the concept's visual brief
const INK = "#0F0B08";
const BOARD = "#151714";
const ORANGE = "#D46A24";
const BUFF = "#F6C56A";
const ALARM = "#FF4B1F";
const GRAY = "#8A8F99";
const GRID = "#1E2028";
const GRID_MAJOR = "#282B36";

// ── Drafting frame in the 1080×1350 page ────────────────────────────
const FRAME = { x: 60, y: 130, w: 960, h: 720 };

// Interior working area (coord space is the FRAME itself, drawn directly).
// Anatomy: reservoir (left) — valve — reaction chamber — nozzle — spray drops flying right.

const CENTER_Y = FRAME.y + 370;

// Reservoir polygon — rounded chamber holding hydroquinone + H2O2
const RESERVOIR = {
  x: FRAME.x + 78,
  y: CENTER_Y - 90,
  w: 214,
  h: 180,
  cx: FRAME.x + 78 + 107,
  cy: CENTER_Y,
};

// Valve — narrow throat between reservoir and reaction chamber
const VALVE = {
  x: RESERVOIR.x + RESERVOIR.w + 10,
  y: CENTER_Y - 22,
  w: 46,
  h: 44,
};

// Reaction chamber — armored polygon (catalase/peroxidase lining)
const CHAMBER = {
  cx: VALVE.x + VALVE.w + 118,
  cy: CENTER_Y,
  rx: 108,
  ry: 92,
};

// Nozzle path — from chamber to opening
const NOZZLE = {
  x0: CHAMBER.cx + CHAMBER.rx - 8,
  y0: CENTER_Y,
  x1: FRAME.x + FRAME.w - 130,
  y1: CENTER_Y,
};

// Firing pulses (right of nozzle) — series of droplets
const N_PULSES = 9;

// ── Helpers ─────────────────────────────────────────────────────────
const easeOut = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

export const BombardierBeetleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Timing (seconds → frames)
  const s = (sec: number) => Math.round(sec * fps);
  const t = frame;

  // 1. Draft strokes appear (0.0 – 0.9s)
  const draftT = easeOut((t - s(0.0)) / s(0.9));
  // 2. Color-in of the chamber body (0.7 – 1.6s)
  const colorT = easeOut((t - s(0.7)) / s(0.9));
  // 3. Fluid appears in reservoir (1.2 – 2.0s)
  const fluidT = easeOut((t - s(1.2)) / s(0.8));
  // 4. Flash in reaction chamber (2.0 – 2.4s)
  const flashRaw = (t - s(2.0)) / s(0.4);
  const flashT = Math.max(0, Math.min(1, flashRaw));
  const flashOn = flashT < 1 ? Math.sin(flashT * Math.PI) : 0;
  // 5. Nozzle jet fires (from 2.15s onward, looping cadence)
  const jetStart = s(2.15);
  // 6. Type lockup (2.4 – 3.2s)
  const titleSpring = spring({
    frame: t - s(2.4),
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(
    t,
    [s(2.9), s(3.6)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  // Oscilloscope sweep — a horizontal traveling window shows a burst
  const oscilloT = interpolate(
    t,
    [s(2.6), s(4.4)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }
  );

  // Pulse droplets flying rightward (loop after they exit)
  const pulseCycle = fps * 1.8; // seconds per full loop of droplet trail
  const pulseFrame = (t - jetStart + durationInFrames) % pulseCycle;
  const pulseProgress = pulseFrame / pulseCycle;

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
        <span style={{ color: ORANGE }}>2026 · 08 · 08</span>
      </div>

      {/* Drafting frame + schematic */}
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

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#181B22" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="chamber-flash" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={BUFF} stopOpacity={0.95} />
            <stop offset="55%" stopColor={ALARM} stopOpacity={0.6} />
            <stop offset="100%" stopColor={ALARM} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="reservoir-fluid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7AB8A0" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#4A8A78" stopOpacity={0.85} />
          </linearGradient>

          <linearGradient id="jet-taper" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={ALARM} stopOpacity={0.95} />
            <stop offset="100%" stopColor={BUFF} stopOpacity={0} />
          </linearGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
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
        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2B2F3A"
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
          <g key={i} stroke={ORANGE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Corner block: figure number */}
        <g
          transform={`translate(${FRAME.x + 22}, ${FRAME.y + 32})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={500}
          fontSize={11}
          letterSpacing={3}
        >
          <text>SCHEMATIC · FIG. II</text>
        </g>

        {/* Scale/spec block: bottom-right of frame */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 210}, ${FRAME.y + FRAME.h - 40})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={2.6}
          fontWeight={500}
        >
          <text y={0}>SCALE · 5:1</text>
          <text y={16}>DWG · BR-0500</text>
        </g>

        {/* ── SCHEMATIC ─────────────────────────────────────────── */}

        {/* Center-line dash across the whole apparatus */}
        <g opacity={0.35}>
          <line
            x1={RESERVOIR.x - 10}
            y1={CENTER_Y}
            x2={NOZZLE.x1 + 50}
            y2={CENTER_Y}
            stroke={GRAY}
            strokeWidth={1}
            strokeDasharray="1 6"
          />
        </g>

        {/* Flow direction carets along the center line — assemble with color */}
        {(() => {
          const stops = [
            RESERVOIR.x + RESERVOIR.w + 2,
            VALVE.x + VALVE.w + 4,
            CHAMBER.cx + CHAMBER.rx - 2,
          ];
          return (
            <g opacity={colorT * 0.6}>
              {stops.map((sx, i) => (
                <polygon
                  key={i}
                  points={`${sx},${CENTER_Y - 4} ${sx + 6},${CENTER_Y} ${sx},${CENTER_Y + 4}`}
                  fill={ORANGE}
                />
              ))}
            </g>
          );
        })()}

        {/* --- Reservoir --- */}
        <g>
          {/* Fluid fill */}
          <clipPath id="res-clip">
            <rect
              x={RESERVOIR.x}
              y={RESERVOIR.y}
              width={RESERVOIR.w}
              height={RESERVOIR.h}
              rx={26}
            />
          </clipPath>
          <g clipPath="url(#res-clip)" opacity={fluidT}>
            <rect
              x={RESERVOIR.x}
              y={RESERVOIR.y + (1 - fluidT) * 80}
              width={RESERVOIR.w}
              height={RESERVOIR.h}
              fill="url(#reservoir-fluid)"
            />
            {/* Meniscus highlight — a thin line along the top of the fluid */}
            <line
              x1={RESERVOIR.x + 6}
              y1={RESERVOIR.y + (1 - fluidT) * 80 + 2}
              x2={RESERVOIR.x + RESERVOIR.w - 6}
              y2={RESERVOIR.y + (1 - fluidT) * 80 + 2}
              stroke={BUFF}
              strokeWidth={1.2}
              opacity={0.35}
            />
            {/* Chemical formulas etched on the tank wall */}
            <text
              x={RESERVOIR.cx}
              y={RESERVOIR.cy + 4}
              textAnchor="middle"
              fill={INK}
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={2.4}
              opacity={0.8}
            >
              C₆H₆O₂
            </text>
            <text
              x={RESERVOIR.cx}
              y={RESERVOIR.cy + 24}
              textAnchor="middle"
              fill={INK}
              fontFamily={inter}
              fontSize={11}
              fontWeight={500}
              letterSpacing={2}
              opacity={0.7}
            >
              + H₂O₂
            </text>
          </g>

          {/* Reservoir walls (draft, then color) */}
          <rect
            x={RESERVOIR.x}
            y={RESERVOIR.y}
            width={RESERVOIR.w}
            height={RESERVOIR.h}
            rx={26}
            fill="none"
            stroke={BUFF}
            strokeWidth={1.2}
            opacity={draftT * 0.35}
          />
          <rect
            x={RESERVOIR.x}
            y={RESERVOIR.y}
            width={RESERVOIR.w}
            height={RESERVOIR.h}
            rx={26}
            fill="none"
            stroke={ORANGE}
            strokeWidth={3}
            strokeLinejoin="round"
            opacity={colorT}
          />
        </g>

        {/* --- Valve --- */}
        <g opacity={colorT}>
          <rect
            x={VALVE.x}
            y={VALVE.y}
            width={VALVE.w}
            height={VALVE.h}
            rx={4}
            fill={INK}
            stroke={ORANGE}
            strokeWidth={2}
          />
          {/* Valve stem: pulses up-down subtly */}
          {(() => {
            const stemY = VALVE.y + 8 + Math.sin((t / fps) * Math.PI * 2 * 3) * 3;
            return (
              <g>
                <line
                  x1={VALVE.x + VALVE.w / 2}
                  y1={VALVE.y + 4}
                  x2={VALVE.x + VALVE.w / 2}
                  y2={stemY}
                  stroke={BUFF}
                  strokeWidth={2}
                />
                <circle
                  cx={VALVE.x + VALVE.w / 2}
                  cy={stemY}
                  r={5}
                  fill={ORANGE}
                  stroke={INK}
                  strokeWidth={1.5}
                />
              </g>
            );
          })()}

        </g>

        {/* --- Reaction chamber (armored polygon) --- */}
        <g>
          {/* Body */}
          <ellipse
            cx={CHAMBER.cx}
            cy={CHAMBER.cy}
            rx={CHAMBER.rx}
            ry={CHAMBER.ry}
            fill={INK}
            stroke={BUFF}
            strokeWidth={1.2}
            opacity={draftT * 0.4}
          />
          <ellipse
            cx={CHAMBER.cx}
            cy={CHAMBER.cy}
            rx={CHAMBER.rx}
            ry={CHAMBER.ry}
            fill="#120E0B"
            stroke={ORANGE}
            strokeWidth={3.5}
            opacity={colorT}
          />

          {/* Enzyme lining — dotted inner ellipse */}
          <ellipse
            cx={CHAMBER.cx}
            cy={CHAMBER.cy}
            rx={CHAMBER.rx - 12}
            ry={CHAMBER.ry - 12}
            fill="none"
            stroke={BUFF}
            strokeWidth={1.4}
            strokeDasharray="2 5"
            opacity={colorT * 0.9}
          />

          {/* Flash (radial gradient) */}
          <ellipse
            cx={CHAMBER.cx}
            cy={CHAMBER.cy}
            rx={CHAMBER.rx - 8}
            ry={CHAMBER.ry - 8}
            fill="url(#chamber-flash)"
            opacity={flashOn * 0.9}
            filter="url(#soft-glow)"
          />

          {/* Bolt marks (armor plates) — subtle */}
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            const bx = CHAMBER.cx + Math.cos(a) * (CHAMBER.rx - 4);
            const by = CHAMBER.cy + Math.sin(a) * (CHAMBER.ry - 4);
            return (
              <circle
                key={i}
                cx={bx}
                cy={by}
                r={2.2}
                fill={ORANGE}
                opacity={colorT * 0.85}
              />
            );
          })}

        </g>

        {/* --- Nozzle --- */}
        <g opacity={colorT}>
          {/* Nozzle expanding cone from chamber to opening */}
          <path
            d={`
              M ${NOZZLE.x0} ${NOZZLE.y0 - 18}
              L ${NOZZLE.x1 - 18} ${NOZZLE.y1 - 30}
              L ${NOZZLE.x1} ${NOZZLE.y1 - 30}
              L ${NOZZLE.x1} ${NOZZLE.y1 + 30}
              L ${NOZZLE.x1 - 18} ${NOZZLE.y1 + 30}
              L ${NOZZLE.x0} ${NOZZLE.y0 + 18}
              Z
            `}
            fill={INK}
            stroke={ORANGE}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          {/* Rifling ticks */}
          {Array.from({ length: 5 }).map((_, i) => {
            const nx = NOZZLE.x0 + 20 + i * ((NOZZLE.x1 - NOZZLE.x0 - 40) / 4);
            return (
              <line
                key={i}
                x1={nx}
                y1={NOZZLE.y0 - 12 + i}
                x2={nx}
                y2={NOZZLE.y0 + 12 - i}
                stroke={ORANGE}
                strokeWidth={1}
                opacity={0.6}
              />
            );
          })}

        </g>

        {/* ── Annotation tags — flag row along the top of the drafting frame ── */}
        {(() => {
          type Tag = { key: string; sub: string; anchorX: number; kickX: number };
          const tags: Tag[] = [
            {
              key: "A · RESERVOIR",
              sub: "HYDROQUINONE + H₂O₂",
              anchorX: RESERVOIR.cx,
              kickX: RESERVOIR.cx - 34,
            },
            {
              key: "B · PRESSURE VALVE",
              sub: "PASSIVE PRESSURE RELIEF",
              anchorX: VALVE.x + VALVE.w / 2,
              kickX: VALVE.x + VALVE.w / 2 + 10,
            },
            {
              key: "C · REACTION CHAMBER",
              sub: "CATALASE · ~100 °C",
              anchorX: CHAMBER.cx,
              kickX: CHAMBER.cx + 4,
            },
            {
              key: "D · NOZZLE",
              sub: "AIMED · SWIVELS 270°",
              anchorX: (NOZZLE.x0 + NOZZLE.x1) / 2 + 10,
              kickX: (NOZZLE.x0 + NOZZLE.x1) / 2 + 40,
            },
          ];

          const bandY = FRAME.y + 60; // where tag boxes sit (top-line of the label)
          const tagW = 208;
          const tagH = 46;
          const gap = (FRAME.w - tagW * tags.length) / (tags.length + 1);

          return (
            <g opacity={colorT}>
              {tags.map((tag, i) => {
                const boxX = FRAME.x + gap + i * (tagW + gap);
                const boxY = bandY;
                const midX = boxX + tagW / 2;
                const bendY = boxY + tagH + 60;
                // Leader: from box bottom-center down, kick horizontally, then down to anchor
                const anchorY =
                  i === 0 || i === 2
                    ? // reservoir & chamber: anchor at top of shape
                      i === 0
                      ? RESERVOIR.y
                      : CHAMBER.cy - CHAMBER.ry
                    : i === 1
                    ? VALVE.y
                    : NOZZLE.y0 - 30; // nozzle: anchor at top of nozzle
                const leader = `M ${midX} ${boxY + tagH}
                  L ${midX} ${bendY}
                  L ${tag.kickX} ${bendY}
                  L ${tag.anchorX} ${anchorY - 4}`;

                return (
                  <g key={tag.key}>
                    <path
                      d={leader}
                      stroke={GRAY}
                      strokeWidth={1}
                      fill="none"
                      opacity={0.75}
                    />
                    {/* Endpoint dot at the anchor */}
                    <circle
                      cx={tag.anchorX}
                      cy={anchorY - 4}
                      r={2.4}
                      fill={ORANGE}
                    />
                    {/* Tag box */}
                    <rect
                      x={boxX}
                      y={boxY}
                      width={tagW}
                      height={tagH}
                      rx={3}
                      fill={INK}
                      stroke={ORANGE}
                      strokeWidth={1.2}
                    />
                    <text
                      x={boxX + 14}
                      y={boxY + 19}
                      fill={BUFF}
                      fontFamily={inter}
                      fontWeight={600}
                      fontSize={11}
                      letterSpacing={2.8}
                    >
                      {tag.key}
                    </text>
                    <text
                      x={boxX + 14}
                      y={boxY + 35}
                      fill={GRAY}
                      fontFamily={inter}
                      fontWeight={500}
                      fontSize={9.5}
                      letterSpacing={2.2}
                    >
                      {tag.sub}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* --- Pulse jet: droplets flying to the right --- */}
        <defs>
          <clipPath id="jet-clip">
            <rect
              x={NOZZLE.x1}
              y={NOZZLE.y1 - 72}
              width={FRAME.x + FRAME.w - NOZZLE.x1 - 6}
              height={144}
            />
          </clipPath>
        </defs>

        {/* Steady jet stem (subtle taper right at the nozzle mouth) */}
        {t > jetStart && (
          <rect
            x={NOZZLE.x1 + 2}
            y={NOZZLE.y1 - 7}
            width={70}
            height={14}
            fill="url(#jet-taper)"
            opacity={0.85}
            filter="url(#soft-glow)"
          />
        )}

        <g clipPath="url(#jet-clip)">
          {Array.from({ length: N_PULSES }).map((_, i) => {
            const offset = i / N_PULSES;
            const p = (pulseProgress + offset) % 1;
            const travelPx = FRAME.x + FRAME.w - NOZZLE.x1 - 24;
            const dx = p * travelPx;
            const alpha = Math.max(0, 1 - p * 0.9);
            const wobble = Math.sin((i + p * 8) * 1.7) * 8 * p;
            const r = 10 - p * 5;
            const on = t > jetStart ? 1 : 0;
            return (
              <g
                key={i}
                opacity={on * alpha}
                transform={`translate(${NOZZLE.x1 + 12 + dx}, ${
                  NOZZLE.y1 + wobble
                })`}
              >
                <ellipse
                  cx={0}
                  cy={0}
                  rx={r * 1.5}
                  ry={r * 0.7}
                  fill={ALARM}
                  opacity={0.95}
                  filter="url(#soft-glow)"
                />
                <ellipse
                  cx={-r * 0.4}
                  cy={-1}
                  rx={r * 0.42}
                  ry={r * 0.28}
                  fill={BUFF}
                  opacity={0.9}
                />
                {/* Trailing dot */}
                <circle
                  cx={r * 1.7}
                  cy={0}
                  r={r * 0.25}
                  fill={ALARM}
                  opacity={0.55}
                />
              </g>
            );
          })}
        </g>

        {/* Caption strip — between schematic and oscilloscope */}
        <g
          transform={`translate(${FRAME.x + 24}, ${CENTER_Y + CHAMBER.ry + 60})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={colorT}
        >
          <line
            x1={0}
            y1={0}
            x2={FRAME.w - 48}
            y2={0}
            stroke="#2B2F3A"
            strokeWidth={1}
          />
          <text y={20}>
            FIG. 2 · DUAL-CHAMBER PULSED SPRAY APPARATUS
          </text>
          <text
            x={FRAME.w - 48}
            y={20}
            textAnchor="end"
            fill={BUFF}
            fontWeight={600}
          >
            EJECTA · 100 °C
          </text>
        </g>

        {/* ── Oscilloscope trace along bottom of frame ─────────── */}
        {(() => {
          const OSC_TOP = FRAME.y + FRAME.h - 118;
          const OSC_H = 60;
          const OSC_X = FRAME.x + 40;
          const OSC_W = FRAME.w - 260;
          const OSC_MID = OSC_TOP + OSC_H / 2;

          // Build a pulse train (~10 spikes across the width)
          const spikes = 10;
          const path: string[] = [`M ${OSC_X} ${OSC_MID}`];
          for (let i = 0; i < spikes; i++) {
            const x0 = OSC_X + (i / spikes) * OSC_W;
            const x1 = OSC_X + ((i + 0.15) / spikes) * OSC_W;
            const x2 = OSC_X + ((i + 0.28) / spikes) * OSC_W;
            const x3 = OSC_X + ((i + 1) / spikes) * OSC_W;
            path.push(
              `L ${x0} ${OSC_MID}`,
              `L ${x1} ${OSC_MID - OSC_H / 2 + 4}`,
              `L ${x2} ${OSC_MID + 8}`,
              `L ${x3} ${OSC_MID}`
            );
          }
          const total = OSC_W;
          const dashLen = total * 3;
          const dashOffset = dashLen * (1 - oscilloT);

          return (
            <g>
              {/* Frame */}
              <rect
                x={OSC_X - 12}
                y={OSC_TOP - 22}
                width={OSC_W + 24}
                height={OSC_H + 44}
                fill="none"
                stroke={GRAY}
                strokeWidth={1}
                opacity={0.45}
              />
              {/* Baseline */}
              <line
                x1={OSC_X}
                y1={OSC_MID}
                x2={OSC_X + OSC_W}
                y2={OSC_MID}
                stroke={GRAY}
                strokeWidth={1}
                opacity={0.4}
                strokeDasharray="2 4"
              />
              {/* Trace */}
              <path
                d={path.join(" ")}
                fill="none"
                stroke={ALARM}
                strokeWidth={1.8}
                strokeLinejoin="miter"
                strokeDasharray={dashLen}
                strokeDashoffset={dashOffset}
                filter="url(#soft-glow)"
                opacity={0.95}
              />

              {/* Labels */}
              <g
                fontFamily={inter}
                fill={GRAY}
                fontSize={10}
                letterSpacing={2.6}
                fontWeight={500}
              >
                <text x={OSC_X - 12} y={OSC_TOP - 8}>
                  P(t)
                </text>
                <text
                  x={OSC_X + OSC_W + 12}
                  y={OSC_TOP - 8}
                  textAnchor="end"
                  fill={BUFF}
                  fontWeight={600}
                >
                  ~500 Hz PULSE TRAIN
                </text>
                <text x={OSC_X - 12} y={OSC_TOP + OSC_H + 18}>
                  t →
                </text>
              </g>
            </g>
          );
        })()}
      </svg>

      {/* ── Type lockup ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 915,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: ORANGE,
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
            Rocket Engineer
          </span>
        </div>

        <div
          style={{
            color: "#F4F1EA",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The beetle that
          <br />
          built a pulsejet.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Threatened, the{" "}
          <span style={{ color: BUFF, fontWeight: 600 }}>
            bombardier beetle
          </span>{" "}
          injects hydroquinones and hydrogen peroxide into an armored,
          enzyme-lined chamber where they react at{" "}
          <span style={{ color: ALARM, fontWeight: 600 }}>~100 °C</span> and
          eject as a{" "}
          <span style={{ color: ALARM, fontWeight: 600 }}>~500 Hz</span> train
          of micro-explosions — a passive pulsejet, evolved 200 million years
          before we built one.
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
        <span>Dean et al. · Science 248 (1990) 1219–1221</span>
        <span>
          <span style={{ color: ALARM }}>●</span> Spray pulse ≈ 2 ms
        </span>
      </div>
    </AbsoluteFill>
  );
};
