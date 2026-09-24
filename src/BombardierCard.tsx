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
const INK = "#0B0E14";
const VELLUM = "#F0E7D2";
const VELLUM_DEEP = "#E4D7B4";
const VERMILION = "#D74915";
const AMBER = "#F2A63A";
const GRAPHITE = "#4E5866";
const GRAPHITE_LIGHT = "#8A93A2";
const RULE = "#B7A97D";

export const BombardierCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slow overall reveal
  const revealSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const titleSpring = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.4, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Callout leader progressive draw
  const leaderProgress = (idx: number): number => {
    const start = fps * (0.55 + idx * 0.13);
    const dur = fps * 0.55;
    return interpolate(frame, [start, start + dur], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  // Pulse-plume: envelope keeps a legible 6 Hz for the eye
  const pulseFreqHz = 6;
  const pulsePhase = (frame / fps) * pulseFreqHz * Math.PI * 2;
  const pulseGain = interpolate(frame, [fps * 0.6, fps * 1.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Oscillogram sweep
  const oscSweep = interpolate(frame, [fps * 1.0, fps * 3.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stampSpring = spring({
    frame: frame - fps * 2.6,
    fps,
    config: { damping: 12, stiffness: 140, mass: 0.6 },
  });

  // ── Page layout (1080 × 1350 portrait) ──────────────────────────────
  // Vellum sheet inset with 60px margin
  const SHEET = { x: 60, y: 60, w: 960, h: 1230 };
  // Drawing area (upper portion of sheet)
  const DRAW = { x: 92, y: 200, w: 896, h: 620 };

  // Beetle geometry (in DRAW coords, origin at DRAW.x,DRAW.y)
  // The beetle body is a horizontal ovoid, head to the left, abdomen to the right.
  // We build it in a local coord system and translate to fit.
  const beetle = {
    cx: 360, // body center x in DRAW-local
    cy: 300, // body center y
    len: 580, // body length (head to abdomen tip)
    ht: 240, // body height
  };

  // Anchor points on the beetle (DRAW-local)
  const headTip = { x: beetle.cx - beetle.len * 0.5, y: beetle.cy };
  const abdomenTip = { x: beetle.cx + beetle.len * 0.5, y: beetle.cy + 6 };
  const reservoirCtr = { x: beetle.cx + beetle.len * 0.06, y: beetle.cy + 30 };
  const reactionCtr = { x: beetle.cx + beetle.len * 0.28, y: beetle.cy + 46 };
  const valveCtr = { x: beetle.cx + beetle.len * 0.44, y: beetle.cy + 44 };

  // Callout anchor destinations (outside the beetle)
  const callouts = [
    {
      id: "1",
      label: "RESERVOIR",
      sub: "hydroquinones + 25% H₂O₂",
      from: reservoirCtr,
      to: { x: 150, y: 90 },
      anchor: "start" as const,
    },
    {
      id: "2",
      label: "REACTION CHAMBER",
      sub: "catalase, peroxidases",
      from: reactionCtr,
      to: { x: 430, y: 70 },
      anchor: "middle" as const,
    },
    {
      id: "3",
      label: "STEERABLE VALVE",
      sub: "270° discharge arc",
      from: valveCtr,
      to: { x: 660, y: 70 },
      anchor: "middle" as const,
    },
    {
      id: "4",
      label: "PULSED JET",
      sub: "≈ 500 Hz · 100 °C · C₆H₄O₂",
      from: { x: abdomenTip.x + 24, y: abdomenTip.y + 4 },
      to: { x: 800, y: 540 },
      anchor: "end" as const,
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Sheet backdrop */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <clipPath id="sheetClip">
            <rect x={SHEET.x + 14} y={SHEET.y + 14} width={SHEET.w - 28} height={SHEET.h - 28} />
          </clipPath>
          <clipPath id="drawInsideClip">
            <rect x={SHEET.x + 20} y={SHEET.y + 130} width={SHEET.w - 40} height={720} />
          </clipPath>
          <radialGradient id="paperGrain" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor={VELLUM} />
            <stop offset="100%" stopColor={VELLUM_DEEP} />
          </radialGradient>
          <linearGradient id="beetleSheen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1D2130" />
            <stop offset="55%" stopColor="#0F1420" />
            <stop offset="100%" stopColor="#050710" />
          </linearGradient>
          <linearGradient id="pronotum" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EE5A20" />
            <stop offset="100%" stopColor="#B03A0F" />
          </linearGradient>
          <radialGradient id="plumeCore" cx="0%" cy="50%" r="100%">
            <stop offset="0%" stopColor="#FFE39A" stopOpacity={1} />
            <stop offset="40%" stopColor={AMBER} stopOpacity={0.9} />
            <stop offset="100%" stopColor={VERMILION} stopOpacity={0} />
          </radialGradient>
          <filter id="plumeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <pattern
            id="hatch"
            width={6}
            height={6}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1={0} y1={0} x2={0} y2={6} stroke={GRAPHITE} strokeWidth={0.7} />
          </pattern>
          <pattern
            id="chamberHatch"
            width={5}
            height={5}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-30)"
          >
            <line x1={0} y1={0} x2={0} y2={5} stroke={VERMILION} strokeWidth={0.5} opacity={0.35} />
          </pattern>
        </defs>

        {/* Ink background */}
        <rect x={0} y={0} width={1080} height={1350} fill={INK} />

        {/* Vellum sheet */}
        <rect
          x={SHEET.x}
          y={SHEET.y}
          width={SHEET.w}
          height={SHEET.h}
          fill="url(#paperGrain)"
        />

        {/* Sheet border double-rule */}
        <rect
          x={SHEET.x + 0.5}
          y={SHEET.y + 0.5}
          width={SHEET.w - 1}
          height={SHEET.h - 1}
          fill="none"
          stroke={GRAPHITE}
          strokeWidth={1}
        />
        <rect
          x={SHEET.x + 12}
          y={SHEET.y + 12}
          width={SHEET.w - 24}
          height={SHEET.h - 24}
          fill="none"
          stroke={GRAPHITE}
          strokeWidth={0.6}
          opacity={0.6}
        />

        {/* Corner registration marks */}
        {(
          [
            [SHEET.x + 30, SHEET.y + 30],
            [SHEET.x + SHEET.w - 30, SHEET.y + 30],
            [SHEET.x + 30, SHEET.y + SHEET.h - 30],
            [SHEET.x + SHEET.w - 30, SHEET.y + SHEET.h - 30],
          ] as const
        ).map(([cx, cy], i) => (
          <g key={i} stroke={VERMILION} strokeWidth={1}>
            <circle cx={cx} cy={cy} r={5} fill="none" />
            <line x1={cx - 9} y1={cy} x2={cx + 9} y2={cy} />
            <line x1={cx} y1={cy - 9} x2={cx} y2={cy + 9} />
          </g>
        ))}

        {/* Top masthead */}
        <g
          fill={GRAPHITE}
          fontFamily={inter}
          fontSize={12}
          letterSpacing={4.5}
          fontWeight={600}
        >
          <text x={SHEET.x + 44} y={SHEET.y + 60}>
            EVERYDAY MOTIVATION · NO. 003
          </text>
          <text
            x={SHEET.x + SHEET.w - 44}
            y={SHEET.y + 60}
            textAnchor="end"
            fill={VERMILION}
          >
            2026 · 09 · 24
          </text>
        </g>

        {/* Section rule */}
        <line
          x1={SHEET.x + 44}
          y1={SHEET.y + 78}
          x2={SHEET.x + SHEET.w - 44}
          y2={SHEET.y + 78}
          stroke={RULE}
          strokeWidth={0.8}
        />

        {/* Sheet sub-header */}
        <g
          fill={GRAPHITE_LIGHT}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.5}
          fontWeight={500}
        >
          <text x={SHEET.x + 44} y={SHEET.y + 108}>
            FIG. 3 · DEFENSIVE APPARATUS · BRACHINUS SP.
          </text>
          <text
            x={SHEET.x + SHEET.w - 44}
            y={SHEET.y + 108}
            textAnchor="end"
            fill={GRAPHITE}
          >
            SHEET 3 / N · REV. A
          </text>
        </g>

        {/* Drawing area with callouts + beetle. Clip is on a wrapper so clip
            coords stay in viewport space and the transform inside is respected. */}
        <g clipPath="url(#drawInsideClip)">
        <g
          transform={`translate(${DRAW.x} ${DRAW.y})`}
          opacity={revealSpring}
        >
          {/* Drawing area frame ticks (subtle) */}
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
            <line
              key={`tickx-${i}`}
              x1={f * DRAW.w}
              y1={-8}
              x2={f * DRAW.w}
              y2={-2}
              stroke={GRAPHITE}
              strokeWidth={0.7}
            />
          ))}

          {/* ── Beetle assembly ────────────────────────────────────── */}
          <g>
            {/* Antennae — filamentous, curling forward */}
            {[-1, 1].map((sgn) => {
              const start = { x: headTip.x + 22, y: headTip.y + sgn * 26 };
              const ctrl1 = { x: headTip.x - 40, y: headTip.y + sgn * 90 };
              const ctrl2 = { x: headTip.x - 120, y: headTip.y + sgn * 200 };
              const end = { x: headTip.x - 190, y: headTip.y + sgn * 230 };
              // Sample points along cubic Bezier for segments
              const cubic = (t: number) => {
                const it = 1 - t;
                const x =
                  it * it * it * start.x +
                  3 * it * it * t * ctrl1.x +
                  3 * it * t * t * ctrl2.x +
                  t * t * t * end.x;
                const y =
                  it * it * it * start.y +
                  3 * it * it * t * ctrl1.y +
                  3 * it * t * t * ctrl2.y +
                  t * t * t * end.y;
                return { x, y };
              };
              return (
                <g key={`ant-${sgn}`}>
                  <path
                    d={`M ${start.x} ${start.y}
                        C ${ctrl1.x} ${ctrl1.y}
                          ${ctrl2.x} ${ctrl2.y}
                          ${end.x} ${end.y}`}
                    stroke="#080A10"
                    strokeWidth={3.4}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((tt, i) => {
                    const p = cubic(tt);
                    return (
                      <circle
                        key={`aseg-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={2.4}
                        fill="#080A10"
                      />
                    );
                  })}
                  {/* Terminal knob */}
                  <circle cx={end.x} cy={end.y} r={4} fill="#080A10" />
                </g>
              );
            })}

            {/* Legs (three pairs, projecting below body) - shorter, so they don't hit the oscillogram */}
            {[-0.18, 0.02, 0.24].map((tx, i) => {
              const px = beetle.cx + tx * beetle.len;
              const py = beetle.cy + beetle.ht * 0.35;
              const dx = i === 0 ? -70 : i === 1 ? -16 : 78;
              const legLen = 80;
              return (
                <g
                  key={`leg-${i}`}
                  stroke="#0A0D14"
                  strokeWidth={5}
                  fill="none"
                  strokeLinecap="round"
                >
                  <path
                    d={`M ${px} ${py}
                        Q ${px + dx * 0.5} ${py + legLen * 0.55}
                          ${px + dx} ${py + legLen}`}
                  />
                  <path
                    d={`M ${px + dx} ${py + legLen}
                        L ${px + dx + (i === 2 ? 18 : -18)} ${py + legLen + 16}`}
                    strokeWidth={3.2}
                  />
                </g>
              );
            })}
            {/* Second set of legs on upper side (partial view) */}
            {[-0.18, 0.02, 0.24].map((tx, i) => {
              const px = beetle.cx + tx * beetle.len;
              const py = beetle.cy - beetle.ht * 0.15;
              const dx = i === 0 ? -55 : i === 1 ? 5 : 70;
              return (
                <g
                  key={`leg-top-${i}`}
                  stroke="#141824"
                  strokeWidth={4.2}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.75}
                >
                  <path
                    d={`M ${px} ${py}
                        Q ${px + dx * 0.5} ${py - 20}
                          ${px + dx} ${py - 40}`}
                  />
                </g>
              );
            })}

            {/* Head */}
            <ellipse
              cx={headTip.x + 34}
              cy={beetle.cy}
              rx={62}
              ry={54}
              fill="url(#beetleSheen)"
              stroke="#050710"
              strokeWidth={1.2}
            />
            {/* Mandibles */}
            <path
              d={`M ${headTip.x - 4} ${beetle.cy - 8}
                  Q ${headTip.x - 30} ${beetle.cy - 12}
                    ${headTip.x - 40} ${beetle.cy - 22}`}
              stroke="#050710"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${headTip.x - 4} ${beetle.cy + 8}
                  Q ${headTip.x - 30} ${beetle.cy + 12}
                    ${headTip.x - 40} ${beetle.cy + 22}`}
              stroke="#050710"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
            {/* Compound eye */}
            <ellipse
              cx={headTip.x + 16}
              cy={beetle.cy - 22}
              rx={9}
              ry={11}
              fill="#F0E7D2"
              opacity={0.5}
            />
            <ellipse
              cx={headTip.x + 16}
              cy={beetle.cy - 22}
              rx={6}
              ry={8}
              fill="#0B0E14"
            />

            {/* Pronotum (vermilion signature) */}
            <path
              d={`M ${headTip.x + 78} ${beetle.cy - 62}
                  Q ${headTip.x + 130} ${beetle.cy - 80}
                    ${headTip.x + 200} ${beetle.cy - 58}
                  L ${headTip.x + 210} ${beetle.cy + 58}
                  Q ${headTip.x + 130} ${beetle.cy + 80}
                    ${headTip.x + 78} ${beetle.cy + 62} Z`}
              fill="url(#pronotum)"
              stroke="#7A2607"
              strokeWidth={1.2}
            />
            {/* Pronotum midline groove */}
            <line
              x1={headTip.x + 108}
              y1={beetle.cy - 68}
              x2={headTip.x + 200}
              y2={beetle.cy - 60}
              stroke="#7A2607"
              strokeWidth={1}
              opacity={0.55}
            />
            <line
              x1={headTip.x + 108}
              y1={beetle.cy + 68}
              x2={headTip.x + 200}
              y2={beetle.cy + 60}
              stroke="#7A2607"
              strokeWidth={1}
              opacity={0.55}
            />

            {/* Elytra (wing covers) — the abdomen body */}
            <path
              d={`M ${headTip.x + 200} ${beetle.cy - 60}
                  Q ${headTip.x + 380} ${beetle.cy - 130}
                    ${headTip.x + 540} ${beetle.cy - 40}
                  Q ${headTip.x + 610} ${beetle.cy}
                    ${headTip.x + 570} ${beetle.cy + 50}
                  Q ${headTip.x + 400} ${beetle.cy + 130}
                    ${headTip.x + 200} ${beetle.cy + 60} Z`}
              fill="url(#beetleSheen)"
              stroke="#050710"
              strokeWidth={1.4}
            />
            {/* Elytra centerline */}
            <line
              x1={headTip.x + 218}
              y1={beetle.cy - 42}
              x2={headTip.x + 560}
              y2={beetle.cy + 6}
              stroke="#0A0D14"
              strokeWidth={1}
              opacity={0.65}
            />
            {/* Elytra striae (fine longitudinal lines) */}
            {[-32, -18, 18, 32, 46].map((dy, i) => (
              <path
                key={`stria-${i}`}
                d={`M ${headTip.x + 226} ${beetle.cy + dy}
                    Q ${headTip.x + 380} ${beetle.cy + dy + (dy < 0 ? -46 : 46) * 0.4}
                      ${headTip.x + 540} ${beetle.cy + dy + (dy < 0 ? -8 : 8)}`}
                stroke="#1A1F2C"
                strokeWidth={0.9}
                fill="none"
                opacity={0.55}
              />
            ))}
            {/* Highlight sheen */}
            <path
              d={`M ${headTip.x + 250} ${beetle.cy - 78}
                  Q ${headTip.x + 380} ${beetle.cy - 110}
                    ${headTip.x + 500} ${beetle.cy - 62}`}
              stroke="#2E3648"
              strokeWidth={1.5}
              fill="none"
              opacity={0.7}
            />

            {/* ── CUTAWAY: reveal internal chambers ──────────────── */}
            {/* Cutaway aperture: a rounded window into the abdomen */}
            <g>
              {/* Cutaway opening (vellum-colored, so it reads as "peeled back") */}
              <path
                d={`M ${headTip.x + 260} ${beetle.cy - 6}
                    Q ${headTip.x + 275} ${beetle.cy + 62}
                      ${headTip.x + 360} ${beetle.cy + 88}
                    L ${headTip.x + 520} ${beetle.cy + 82}
                    Q ${headTip.x + 560} ${beetle.cy + 58}
                      ${headTip.x + 552} ${beetle.cy + 10}
                    L ${headTip.x + 340} ${beetle.cy - 8} Z`}
                fill={VELLUM}
                stroke="#050710"
                strokeWidth={1.4}
                strokeLinejoin="round"
              />
              {/* Torn-cut hatching along the top of cutaway */}
              <path
                d={`M ${headTip.x + 262} ${beetle.cy - 4}
                    L ${headTip.x + 552} ${beetle.cy + 8}`}
                stroke={VERMILION}
                strokeWidth={0.8}
                strokeDasharray="4 3"
                opacity={0.75}
                fill="none"
              />

              {/* Reservoir (upper-left inside cutaway) */}
              <g>
                <ellipse
                  cx={reservoirCtr.x}
                  cy={reservoirCtr.y}
                  rx={62}
                  ry={30}
                  fill={VELLUM_DEEP}
                  stroke={GRAPHITE}
                  strokeWidth={1.2}
                />
                <ellipse
                  cx={reservoirCtr.x}
                  cy={reservoirCtr.y}
                  rx={54}
                  ry={22}
                  fill="url(#chamberHatch)"
                  stroke="none"
                />
                <text
                  x={reservoirCtr.x}
                  y={reservoirCtr.y + 3}
                  textAnchor="middle"
                  fill={GRAPHITE}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={2.5}
                  fontWeight={600}
                >
                  1
                </text>
              </g>

              {/* Reaction chamber (thick-walled — Kevlar-like) */}
              <g>
                <ellipse
                  cx={reactionCtr.x}
                  cy={reactionCtr.y}
                  rx={44}
                  ry={26}
                  fill={VELLUM}
                  stroke={VERMILION}
                  strokeWidth={3}
                />
                <ellipse
                  cx={reactionCtr.x}
                  cy={reactionCtr.y}
                  rx={44}
                  ry={26}
                  fill="none"
                  stroke={GRAPHITE}
                  strokeWidth={0.7}
                  strokeDasharray="2 3"
                />
                {/* Enzyme "cells" — small dots */}
                {[[-16, -6], [-4, 6], [10, -4], [22, 8], [-12, 10], [4, -10]].map(
                  ([dx, dy], i) => (
                    <circle
                      key={`enz-${i}`}
                      cx={reactionCtr.x + dx}
                      cy={reactionCtr.y + dy}
                      r={1.6}
                      fill={VERMILION}
                    />
                  ),
                )}
                <text
                  x={reactionCtr.x - 2}
                  y={reactionCtr.y - 32}
                  textAnchor="middle"
                  fill={VERMILION}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={2.5}
                  fontWeight={700}
                >
                  2
                </text>
              </g>

              {/* Connection tube: reservoir → reaction */}
              <path
                d={`M ${reservoirCtr.x + 58} ${reservoirCtr.y + 4}
                    Q ${reservoirCtr.x + 90} ${reservoirCtr.y + 30}
                      ${reactionCtr.x - 40} ${reactionCtr.y - 4}`}
                stroke={GRAPHITE}
                strokeWidth={1.4}
                fill="none"
              />
              {/* Directional arrow (flow) */}
              {(() => {
                const arrowGain = interpolate(
                  frame,
                  [fps * 0.9, fps * 1.4],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );
                return (
                  <g opacity={arrowGain}>
                    <polygon
                      points={`${reactionCtr.x - 40},${reactionCtr.y - 8}
                               ${reactionCtr.x - 32},${reactionCtr.y - 3}
                               ${reactionCtr.x - 40},${reactionCtr.y + 2}`}
                      fill={GRAPHITE}
                    />
                  </g>
                );
              })()}

              {/* Exit valve */}
              <g>
                <rect
                  x={valveCtr.x - 14}
                  y={valveCtr.y - 12}
                  width={28}
                  height={24}
                  rx={2}
                  fill={VELLUM_DEEP}
                  stroke={GRAPHITE}
                  strokeWidth={1.2}
                />
                {/* Rotator arc */}
                <path
                  d={`M ${valveCtr.x + 22} ${valveCtr.y - 18}
                      A 22 22 0 1 1 ${valveCtr.x + 22} ${valveCtr.y + 18}`}
                  fill="none"
                  stroke={GRAPHITE_LIGHT}
                  strokeWidth={0.8}
                  strokeDasharray="2 3"
                />
                <text
                  x={valveCtr.x}
                  y={valveCtr.y + 3}
                  textAnchor="middle"
                  fill={GRAPHITE}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={2.5}
                  fontWeight={700}
                >
                  3
                </text>
              </g>

              {/* Reaction → valve tube */}
              <path
                d={`M ${reactionCtr.x + 40} ${reactionCtr.y + 4}
                    L ${valveCtr.x - 14} ${valveCtr.y}`}
                stroke={GRAPHITE}
                strokeWidth={1.4}
                fill="none"
              />
            </g>
          </g>

          {/* ── Pulsed jet plume (staccato) ───────────────────────── */}
          <g>
            {[0, 1, 2, 3, 4].map((i) => {
              const puffAge = ((frame / fps) * pulseFreqHz + i * 0.19) % 1;
              const distance = 24 + puffAge * 170;
              const cxp = abdomenTip.x + distance;
              const cyp = abdomenTip.y + Math.sin(pulsePhase + i) * 3.5;
              const alpha = (1 - puffAge) * 0.9 * pulseGain;
              const size = 24 + puffAge * 36;
              return (
                <g key={`plume-${i}`} opacity={alpha}>
                  <ellipse
                    cx={cxp}
                    cy={cyp}
                    rx={size}
                    ry={size * 0.6}
                    fill="url(#plumeCore)"
                    filter="url(#plumeGlow)"
                  />
                </g>
              );
            })}
            {/* Bright core at nozzle */}
            <ellipse
              cx={abdomenTip.x + 22}
              cy={abdomenTip.y}
              rx={22 * pulseGain}
              ry={14 * pulseGain}
              fill="#FFF3C7"
              opacity={0.8 + 0.2 * Math.sin(pulsePhase * 2)}
            />
          </g>

          {/* ── Callouts (drawn AFTER beetle so they sit on top) ──── */}
          {callouts.map((c, i) => {
            const p = leaderProgress(i);
            const midX = c.from.x + (c.to.x - c.from.x) * 0.5;
            const midY = c.from.y - 55;
            const seg1x = c.from.x + (midX - c.from.x) * Math.min(1, p * 2);
            const seg1y = c.from.y + (midY - c.from.y) * Math.min(1, p * 2);
            const seg2x =
              p > 0.5 ? midX + (c.to.x - midX) * ((p - 0.5) * 2) : midX;
            const seg2y =
              p > 0.5 ? midY + (c.to.y - midY) * ((p - 0.5) * 2) : midY;
            const labelX =
              c.anchor === "start"
                ? c.to.x + 22
                : c.anchor === "end"
                  ? c.to.x - 22
                  : c.to.x;
            return (
              <g key={`co-${c.id}`}>
                {/* From-point dot */}
                <circle
                  cx={c.from.x}
                  cy={c.from.y}
                  r={p > 0.02 ? 3.5 : 0}
                  fill={VERMILION}
                />
                {/* Leader line, drawn in two segments */}
                <line
                  x1={c.from.x}
                  y1={c.from.y}
                  x2={seg1x}
                  y2={seg1y}
                  stroke={GRAPHITE}
                  strokeWidth={1.2}
                />
                {p > 0.5 && (
                  <line
                    x1={midX}
                    y1={midY}
                    x2={seg2x}
                    y2={seg2y}
                    stroke={GRAPHITE}
                    strokeWidth={1.2}
                  />
                )}
                {/* Number chip at target */}
                <g opacity={p > 0.75 ? 1 : 0}>
                  <circle
                    cx={c.to.x}
                    cy={c.to.y}
                    r={14}
                    fill={VERMILION}
                    stroke={INK}
                    strokeWidth={1.5}
                  />
                  <text
                    x={c.to.x}
                    y={c.to.y + 5}
                    textAnchor="middle"
                    fill={VELLUM}
                    fontFamily={inter}
                    fontSize={14}
                    fontWeight={800}
                  >
                    {c.id}
                  </text>
                  <text
                    x={labelX}
                    y={c.to.y + 30}
                    textAnchor={c.anchor}
                    fill={INK}
                    fontFamily={inter}
                    fontSize={13}
                    fontWeight={700}
                    letterSpacing={2.8}
                  >
                    {c.label}
                  </text>
                  <text
                    x={labelX}
                    y={c.to.y + 48}
                    textAnchor={c.anchor}
                    fill={GRAPHITE}
                    fontFamily={inter}
                    fontSize={12}
                    fontStyle="italic"
                    letterSpacing={0.5}
                  >
                    {c.sub}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
        </g>

        {/* ── Oscillogram band (pulse frequency) ─────────────────── */}
        <g transform={`translate(${SHEET.x + 44} ${SHEET.y + 780})`}>
          <g fill={GRAPHITE} fontFamily={inter} fontSize={10} letterSpacing={3} fontWeight={600}>
            <text x={0} y={0}>PULSE OSCILLOGRAM · f ≈ 500 Hz</text>
            <text x={SHEET.w - 88} y={0} textAnchor="end" fill={VERMILION}>
              t = 2 ms/div
            </text>
          </g>
          {/* Baseline axis */}
          <line
            x1={0}
            y1={62}
            x2={SHEET.w - 88}
            y2={62}
            stroke={GRAPHITE}
            strokeWidth={0.8}
          />
          {/* Tick marks */}
          {Array.from({ length: 21 }).map((_, i) => (
            <line
              key={`osx-${i}`}
              x1={(i / 20) * (SHEET.w - 88)}
              y1={60}
              x2={(i / 20) * (SHEET.w - 88)}
              y2={66}
              stroke={GRAPHITE_LIGHT}
              strokeWidth={0.6}
            />
          ))}
          {/* Pulse spikes drawn in as oscSweep advances */}
          {Array.from({ length: 18 }).map((_, i) => {
            const x = (i + 0.6) * ((SHEET.w - 88) / 18);
            const revealed = oscSweep * 18 > i;
            const jitter = (i % 4 === 0 ? 6 : 0) - (i % 5 === 0 ? 4 : 0);
            const h = 34 + jitter;
            if (!revealed) return null;
            return (
              <g key={`spk-${i}`}>
                <line
                  x1={x}
                  y1={62}
                  x2={x}
                  y2={62 - h}
                  stroke={VERMILION}
                  strokeWidth={1.6}
                />
                <circle cx={x} cy={62 - h} r={2.2} fill={VERMILION} />
              </g>
            );
          })}
        </g>

        {/* ── Type block (title + hook) ──────────────────────────── */}
        <g
          transform={`translate(${SHEET.x + 44} ${SHEET.y + 900})`}
          opacity={titleSpring}
        >
          {/* Role tag */}
          <text
            x={0}
            y={0}
            fill={VERMILION}
            fontFamily={inter}
            fontSize={13}
            letterSpacing={6}
            fontWeight={700}
          >
            ROLE
          </text>
          <text
            x={64}
            y={0}
            fill={GRAPHITE_LIGHT}
            fontFamily={inter}
            fontSize={13}
            letterSpacing={4}
            fontWeight={500}
          >
            /
          </text>
          <text
            x={82}
            y={0}
            fill={INK}
            fontFamily={inter}
            fontSize={13}
            letterSpacing={5}
            fontWeight={700}
          >
            COMBUSTION ENGINEER
          </text>
        </g>

        {/* Title (Playfair italic) */}
        <foreignObject
          x={SHEET.x + 44}
          y={SHEET.y + 918}
          width={SHEET.w - 88}
          height={220}
          opacity={titleSpring}
        >
          <div
            style={{
              opacity: titleSpring,
              transform: `translateY(${interpolate(
                titleSpring,
                [0, 1],
                [14, 0],
              )}px)`,
              color: INK,
              fontFamily: playfair,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 78,
              lineHeight: 0.96,
              letterSpacing: -1.4,
              marginTop: 20,
            }}
          >
            The beetle that
            <br />
            built a pulsejet.
          </div>
        </foreignObject>

        {/* Hook body */}
        <foreignObject
          x={SHEET.x + 44}
          y={SHEET.y + 1080}
          width={SHEET.w - 100}
          height={110}
        >
          <div
            style={{
              opacity: hookOpacity,
              color: "#2A2E38",
              fontFamily: inter,
              fontSize: 17.5,
              lineHeight: 1.42,
              fontWeight: 400,
              maxWidth: 800,
            }}
          >
            Inside a hardened abdominal chamber,{" "}
            <span style={{ color: VERMILION, fontWeight: 700 }}>Brachinus</span>{" "}
            mixes hydroquinones and 25% hydrogen peroxide with catalase and
            peroxidases, discharging a 100 °C benzoquinone spray in a staccato
            jet at ≈500 pulses per second — a biological pulsejet.
          </div>
        </foreignObject>

        {/* Footer band */}
        <g transform={`translate(${SHEET.x + 44} ${SHEET.y + SHEET.h - 42})`}>
          <line
            x1={0}
            y1={-18}
            x2={SHEET.w - 88}
            y2={-18}
            stroke={RULE}
            strokeWidth={0.8}
          />
          <g
            fill={GRAPHITE}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            <text x={0} y={0}>
              DEAN · ANESHANSLEY · EDGERTON · EISNER · SCIENCE 248 (1990) 1219
            </text>
            <text
              x={SHEET.w - 88}
              y={0}
              textAnchor="end"
              fill={VERMILION}
            >
              <tspan style={{ fontWeight: 700 }}>●</tspan> f ≈ 500 Hz · 100 °C
            </text>
          </g>
        </g>

        {/* ── Approval stamp (spring bounce in — inside the sheet's top-right dead space) ── */}
        <g
          transform={`translate(${SHEET.x + SHEET.w - 148} ${SHEET.y + 192}) rotate(-7) scale(${0.72 * stampSpring})`}
          opacity={Math.min(1, stampSpring)}
        >
          <rect
            x={-98}
            y={-40}
            width={196}
            height={80}
            fill={VELLUM}
            fillOpacity={0.75}
            stroke={VERMILION}
            strokeWidth={2.8}
            rx={4}
          />
          <rect
            x={-92}
            y={-34}
            width={184}
            height={68}
            fill="none"
            stroke={VERMILION}
            strokeWidth={1}
            rx={2}
          />
          <text
            x={0}
            y={-6}
            textAnchor="middle"
            fill={VERMILION}
            fontFamily={inter}
            fontSize={19}
            fontWeight={700}
            letterSpacing={4.5}
          >
            APPROVED
          </text>
          <text
            x={0}
            y={20}
            textAnchor="middle"
            fill={VERMILION}
            fontFamily={inter}
            fontSize={9}
            fontWeight={600}
            letterSpacing={2.4}
          >
            BY NATURAL SELECTION · 40 Myr
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
