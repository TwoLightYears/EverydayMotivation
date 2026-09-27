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
const INK = "#0B1220";
const BOARD = "#0F1826";
const CREAM = "#E5DFCF";
const CREAM_DIM = "#B7B0A0";
const SEPIA = "#6C4A2B";
const SEPIA_DEEP = "#3E2A18";
const CERE = "#F2C46A";
const CERE_DEEP = "#C88E2B";
const SLATE = "#8FA3B8";
const SLATE_DIM = "#5C6E82";
const GRID = "#182335";
const GRID_MAJOR = "#22314A";

// ── Falcon anatomy (local coords, head at right, body along +x, belly at +y)
// Local box roughly 620 × 240.
// Nostril landmark for Detail-A leader
const NOSTRIL_LOCAL = { x: 575, y: 118 };

// Rotation math
const DIVE_ANGLE_DEG = 62;

const rotatePt = (p: { x: number; y: number }, deg: number) => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};

// ── Falcon component drawn in local space ─────────────────────────────────
// Local box roughly 620 × 260, head at right.
const Falcon: React.FC = () => (
  <g>
    {/* Under-shadow */}
    <g opacity={0.4} transform="translate(4 6)">
      <path
        d="M 585 140
           C 590 175 555 210 460 224
           C 340 234 210 226 120 210
           C 70 200 30 188 10 178
           L 42 148
           L 105 138
           C 220 122 360 108 470 108
           C 528 108 570 120 585 140 Z"
        fill={INK}
      />
    </g>

    {/* Cream body (chunky teardrop with pronounced chest) */}
    <path
      d="M 585 140
         C 590 175 555 210 460 224
         C 340 234 210 226 120 210
         C 70 200 30 188 10 178
         L 42 148
         L 105 138
         C 220 122 360 108 470 108
         C 528 108 570 120 585 140 Z"
      fill={CREAM}
      stroke={SEPIA_DEEP}
      strokeWidth={1.4}
    />

    {/* Very faint barring — clipped so it stays inside body */}
    <defs>
      <clipPath id="belly-clip">
        <path d="M 585 140
                 C 590 175 555 210 460 224
                 C 340 234 210 226 120 210
                 C 70 200 30 188 10 178
                 L 42 148
                 L 105 138
                 C 220 122 360 108 470 108
                 C 528 108 570 120 585 140 Z" />
      </clipPath>
    </defs>
    <g clipPath="url(#belly-clip)" opacity={0.28}>
      {[
        [150, 172, 44],
        [210, 176, 48],
        [270, 180, 48],
        [330, 182, 48],
        [390, 180, 46],
        [130, 200, 40],
        [190, 204, 44],
        [250, 206, 44],
        [310, 208, 44],
      ].map(([x, y, w], i) => (
        <line
          key={i}
          x1={x}
          y1={y}
          x2={x + w}
          y2={y}
          stroke={SEPIA}
          strokeWidth={1}
        />
      ))}
    </g>

    {/* Wing 1 — main tucked wing sweeping from shoulder down along the back.
        Sits on top of the body and reads as a distinct shape. */}
    <path
      d="M 490 96
         C 460 88 420 90 380 100
         C 320 116 250 138 175 158
         C 130 170 90 178 55 180
         C 100 172 170 158 240 142
         C 320 124 400 110 465 106
         C 480 106 490 106 495 108
         C 500 108 500 100 490 96 Z"
      fill={SEPIA}
      stroke={SEPIA_DEEP}
      strokeWidth={1.2}
    />
    {/* Wing 2 — a second, higher wing layer visible on the back (giving depth) */}
    <path
      d="M 480 100
         C 440 96 400 100 360 112
         C 300 128 240 146 180 160
         C 145 168 115 174 90 176
         C 130 170 185 158 245 142
         C 310 126 380 116 440 110
         C 465 108 480 106 480 100 Z"
      fill={SEPIA_DEEP}
      opacity={0.7}
    />
    {/* Wing tip feather cut-lines */}
    {[
      "M 460 108 C 400 118 320 138 240 158",
      "M 452 114 C 395 124 315 142 235 162",
      "M 445 120 C 388 130 310 148 232 168",
    ].map((d, i) => (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={INK}
        strokeWidth={0.6}
        opacity={0.35}
      />
    ))}

    {/* Head — rounded shape with distinct crown */}
    <path
      d="M 500 82
         C 470 78 452 92 456 112
         C 462 128 500 138 545 138
         C 578 136 594 124 594 108
         C 594 86 555 74 500 82 Z"
      fill={SEPIA}
      stroke={SEPIA_DEEP}
      strokeWidth={1.4}
    />
    {/* Crown darker cap */}
    <path
      d="M 498 84
         C 522 76 560 76 584 88
         C 588 82 578 72 550 68
         C 518 66 494 76 498 84 Z"
      fill={SEPIA_DEEP}
    />

    {/* Beak — clearly hooked, projecting forward beyond head */}
    <path
      d="M 588 108
         L 622 118
         L 616 128
         L 600 132
         L 588 130
         Q 582 118 588 108 Z"
      fill={SEPIA_DEEP}
      stroke={INK}
      strokeWidth={0.9}
    />
    {/* Beak mouth-line */}
    <path
      d="M 590 122 L 615 124"
      stroke={INK}
      strokeWidth={0.9}
      opacity={0.85}
    />

    {/* Cere — yellow patch between beak and eye */}
    <path
      d="M 555 100
         Q 582 96 592 108
         Q 594 118 582 120
         Q 566 122 555 118
         Q 548 108 555 100 Z"
      fill={CERE}
      stroke={CERE_DEEP}
      strokeWidth={0.8}
    />
    {/* Nostril mark (also the anchor for Detail-A leader) */}
    <circle cx={NOSTRIL_LOCAL.x} cy={NOSTRIL_LOCAL.y} r={3} fill={SEPIA_DEEP} />
    <circle cx={NOSTRIL_LOCAL.x} cy={NOSTRIL_LOCAL.y} r={1.2} fill={CERE_DEEP} />

    {/* Malar (moustache) stripe — signature peregrine */}
    <path
      d="M 538 108
         Q 540 122 546 132
         Q 552 138 549 140
         Q 540 132 534 118 Z"
      fill={INK}
    />

    {/* Eye ring + pupil + highlight */}
    <circle
      cx={530}
      cy={100}
      r={8}
      fill={CERE}
      stroke={CERE_DEEP}
      strokeWidth={0.9}
    />
    <circle cx={530} cy={100} r={5.2} fill={INK} />
    <circle cx={531.6} cy={98.5} r={1.5} fill={CREAM} />

    {/* Tail — pointed chevron with feather bars */}
    <path
      d="M 105 190
         L 30 210
         L 8 200
         L 18 180
         L 60 176
         Z"
      fill={SEPIA}
      stroke={SEPIA_DEEP}
      strokeWidth={1}
    />
    <line
      x1={28}
      y1={198}
      x2={80}
      y2={188}
      stroke={CREAM}
      strokeWidth={1}
      opacity={0.55}
    />
    <line
      x1={32}
      y1={202}
      x2={80}
      y2={192}
      stroke={CREAM}
      strokeWidth={1}
      opacity={0.4}
    />

    {/* Talons tucked under belly */}
    <g stroke={SEPIA_DEEP} strokeWidth={1.2} fill="none">
      <path d="M 320 222 L 316 230 L 312 225" />
      <path d="M 338 224 L 334 232 L 330 227" />
      <path d="M 300 220 L 296 228 L 292 223" />
    </g>
  </g>
);

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 22, mass: 1.2, stiffness: 90 },
  });
  const titleSpring = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.2, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const speedProgress = interpolate(
    frame,
    [fps * 0.2, fps * 2.4],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const airspeed = Math.round(speedProgress * 389);
  const detailFade = interpolate(frame, [fps * 1.8, fps * 2.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Frame
  const FRAME = { x: 60, y: 130, w: 960, h: 740 };

  // Falcon transform: place slightly upper-left of frame center, diving
  // toward the lower-right (into the Detail-A inset).
  const falconCX = 470;
  const falconCY = 410;
  const falconScale = 0.78;
  const localCenter = { x: 310, y: 150 };

  const enterOffset = 240 * (1 - enterSpring);
  const enterDx = enterOffset * Math.cos((DIVE_ANGLE_DEG * Math.PI) / 180);
  const enterDy = enterOffset * Math.sin((DIVE_ANGLE_DEG * Math.PI) / 180);

  const nostrilLocalOffset = {
    x: (NOSTRIL_LOCAL.x - localCenter.x) * falconScale,
    y: (NOSTRIL_LOCAL.y - localCenter.y) * falconScale,
  };
  const nostrilRotated = rotatePt(nostrilLocalOffset, DIVE_ANGLE_DEG);
  const nostrilWorld = {
    x: falconCX - enterDx + nostrilRotated.x,
    y: falconCY - enterDy + nostrilRotated.y,
  };

  // Wind streaks trailing behind (opposite dive vector)
  const backDir = {
    x: -Math.cos((DIVE_ANGLE_DEG * Math.PI) / 180),
    y: -Math.sin((DIVE_ANGLE_DEG * Math.PI) / 180),
  };
  const perpDir = { x: -backDir.y, y: backDir.x };
  const windStreaks: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    op: number;
    w: number;
  }[] = [];
  for (let i = -5; i <= 5; i++) {
    if (i === 0) continue;
    const off = i * 26;
    const startX = falconCX + perpDir.x * off + backDir.x * 85;
    const startY = falconCY + perpDir.y * off + backDir.y * 85;
    const streakLen = 260 - Math.abs(i) * 18;
    windStreaks.push({
      x1: startX,
      y1: startY,
      x2: startX + backDir.x * streakLen,
      y2: startY + backDir.y * streakLen,
      op: 0.85 - Math.abs(i) * 0.08,
      w: 1.6 - Math.abs(i) * 0.1,
    });
  }

  // Detail A — bottom-right, where the beak is pointing
  const DETAIL = { cx: 860, cy: 760, r: 100 };
  // Speed dial — bottom-left
  const DIAL = { cx: 200, cy: 760, r: 88 };
  const needleDeg = -135 + (speedProgress * 389) / 400 * 180;

  const altTicks = [0, 500, 1000, 1500, 2000];

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
          color: SLATE,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: CERE }}>2026 · 09 · 27</span>
      </div>

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
              d="M 40 0 L 0 0 0 40"
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
              d="M 160 0 L 0 0 0 160"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#152137" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="detail-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1B2A45" />
            <stop offset="100%" stopColor="#0E1729" />
          </radialGradient>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Board */}
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
          stroke="#2B3A55"
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
          <g key={i} stroke={CERE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Dive-angle protractor — top-left corner */}
        <g transform={`translate(${FRAME.x + 30}, ${FRAME.y + 34})`}>
          <text
            fill={SLATE}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3}
          >
            DIVE ANGLE
          </text>
          <g transform="translate(6, 30)">
            {/* Vertical reference line (0° = horizontal, 90° = straight down) */}
            <line
              x1={0}
              y1={0}
              x2={90}
              y2={0}
              stroke={SLATE_DIM}
              strokeWidth={1}
            />
            {/* Protractor arc */}
            <path
              d="M 90 0 A 90 90 0 0 1 0 90"
              fill="none"
              stroke={SLATE_DIM}
              strokeWidth={1}
            />
            {/* Tick marks (skip 60° — the readout uses that spot) */}
            {[0, 30, 90].map((deg) => {
              const r = (deg * Math.PI) / 180;
              const x1 = Math.cos(r) * 90;
              const y1 = Math.sin(r) * 90;
              const x2 = Math.cos(r) * 98;
              const y2 = Math.sin(r) * 98;
              const lx = Math.cos(r) * 112;
              const ly = Math.sin(r) * 112 + 4;
              const anchor: "start" | "middle" | "end" =
                deg === 0 ? "start" : deg === 90 ? "middle" : "start";
              return (
                <g key={deg}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={SLATE}
                    strokeWidth={1.2}
                  />
                  <text
                    x={lx}
                    y={ly + (deg === 90 ? 6 : 0) + (deg === 0 ? -6 : 0)}
                    fill={SLATE_DIM}
                    fontFamily={inter}
                    fontSize={9}
                    fontWeight={500}
                    letterSpacing={1.2}
                    textAnchor={anchor}
                  >
                    {deg}°
                  </text>
                </g>
              );
            })}
            {/* Current dive-angle vector */}
            <line
              x1={0}
              y1={0}
              x2={Math.cos((DIVE_ANGLE_DEG * Math.PI) / 180) * 90}
              y2={Math.sin((DIVE_ANGLE_DEG * Math.PI) / 180) * 90}
              stroke={CERE}
              strokeWidth={2.4}
            />
            {/* Tick at the current dive angle */}
            <line
              x1={Math.cos((DIVE_ANGLE_DEG * Math.PI) / 180) * 90}
              y1={Math.sin((DIVE_ANGLE_DEG * Math.PI) / 180) * 90}
              x2={Math.cos((DIVE_ANGLE_DEG * Math.PI) / 180) * 100}
              y2={Math.sin((DIVE_ANGLE_DEG * Math.PI) / 180) * 100}
              stroke={CERE}
              strokeWidth={2}
            />
            {/* Angle readout at outer edge of arc */}
            <text
              x={Math.cos((DIVE_ANGLE_DEG * Math.PI) / 180) * 114}
              y={Math.sin((DIVE_ANGLE_DEG * Math.PI) / 180) * 114 + 5}
              fill={CERE}
              fontFamily={inter}
              fontSize={14}
              fontWeight={600}
              letterSpacing={0.5}
            >
              {DIVE_ANGLE_DEG}°
            </text>
            {/* Origin dot */}
            <circle cx={0} cy={0} r={2.5} fill={CERE} />
          </g>
        </g>

        {/* Altitude ticks — right edge */}
        <g transform={`translate(${FRAME.x + FRAME.w - 20}, ${FRAME.y + 60})`}>
          <text
            fill={SLATE}
            fontFamily={inter}
            fontSize={11}
            fontWeight={600}
            letterSpacing={3}
            textAnchor="end"
          >
            ALT · M
          </text>
          {altTicks
            .slice()
            .reverse()
            .map((m, i) => {
              const y = 32 + i * 108;
              return (
                <g key={m}>
                  <line
                    x1={-10}
                    y1={y}
                    x2={0}
                    y2={y}
                    stroke={SLATE_DIM}
                    strokeWidth={1.2}
                  />
                  {[1, 2, 3, 4].map((k) => (
                    <line
                      key={k}
                      x1={-4}
                      y1={y + k * 21.6}
                      x2={0}
                      y2={y + k * 21.6}
                      stroke={SLATE_DIM}
                      strokeWidth={0.8}
                      opacity={0.55}
                    />
                  ))}
                  <text
                    x={-16}
                    y={y + 4}
                    fill={SLATE_DIM}
                    fontFamily={inter}
                    fontSize={10}
                    fontWeight={500}
                    letterSpacing={1.5}
                    textAnchor="end"
                  >
                    {m}
                  </text>
                </g>
              );
            })}
        </g>

        {/* Wind streaks trailing behind falcon */}
        <g opacity={enterSpring}>
          {windStreaks.map((s, i) => (
            <line
              key={i}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={SLATE}
              strokeOpacity={s.op}
              strokeWidth={s.w}
              strokeDasharray="3 7"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Falcon */}
        <g
          transform={`translate(${falconCX - enterDx}, ${falconCY - enterDy}) rotate(${DIVE_ANGLE_DEG}) scale(${falconScale}) translate(${-localCenter.x}, ${-localCenter.y})`}
        >
          <Falcon />
        </g>

        {/* Detail-A callout leader — from nostril to inset */}
        <g opacity={detailFade}>
          <circle
            cx={nostrilWorld.x}
            cy={nostrilWorld.y}
            r={7}
            fill="none"
            stroke={CERE}
            strokeWidth={1.4}
          />
          <line
            x1={nostrilWorld.x}
            y1={nostrilWorld.y}
            x2={DETAIL.cx - DETAIL.r * 0.66}
            y2={DETAIL.cy - DETAIL.r * 0.72}
            stroke={CERE}
            strokeWidth={1.1}
            strokeDasharray="1 3"
          />

          {/* Detail-A inset */}
          <circle
            cx={DETAIL.cx}
            cy={DETAIL.cy}
            r={DETAIL.r}
            fill="url(#detail-bg)"
          />
          <circle
            cx={DETAIL.cx}
            cy={DETAIL.cy}
            r={DETAIL.r}
            fill="none"
            stroke={CERE}
            strokeWidth={1.4}
          />
          <circle
            cx={DETAIL.cx}
            cy={DETAIL.cy}
            r={DETAIL.r - 8}
            fill="none"
            stroke={CERE_DEEP}
            strokeWidth={0.6}
            strokeDasharray="1 4"
          />

          {/* Inside the inset: enlarged cross-section of the nostril */}
          <g transform={`translate(${DETAIL.cx}, ${DETAIL.cy})`}>
            {/* Beak base / head profile background */}
            <path
              d="M -72 44
                 Q -58 -6 -2 -28
                 Q 34 -30 60 -22
                 L 72 -12
                 L 62 8
                 L 34 12
                 Q 6 20 -22 44
                 Z"
              fill={SEPIA}
              stroke={SEPIA_DEEP}
              strokeWidth={1.2}
            />
            {/* Cere yellow zone */}
            <path
              d="M -2 -28 Q 34 -30 60 -22 L 72 -12 L 62 8 L 34 12 Q 20 6 6 0 Q -8 -8 -2 -28 Z"
              fill={CERE}
              stroke={CERE_DEEP}
              strokeWidth={0.9}
            />
            {/* Nostril opening (dark disk) */}
            <circle cx={30} cy={-8} r={18} fill={INK} stroke={SEPIA_DEEP} strokeWidth={1} />
            {/* The bony tubercle — the "inlet cone" */}
            <circle cx={30} cy={-8} r={6} fill={CERE_DEEP} />
            <circle cx={30} cy={-8} r={3.2} fill={CERE} />
            <circle cx={30.6} cy={-9} r={1} fill={CREAM} />

            {/* Vortex airflow curves swirling around the tubercle */}
            {[0, 1, 2].map((i) => {
              const off = i * 4;
              return (
                <path
                  key={i}
                  d={`M ${-56 + off} ${-34 + off}
                      Q ${-14 + off} ${-30 + off} ${18 + off} ${-24}
                      Q ${52} ${-8} ${38} ${8 - off}
                      Q ${18} ${22 - off} ${-14 + off} ${22 - off}`}
                  fill="none"
                  stroke={SLATE}
                  strokeWidth={1.2}
                  opacity={0.65 - i * 0.15}
                  strokeLinecap="round"
                />
              );
            })}
            {/* Arrowhead on innermost airflow */}
            <path d="M -16 22 L -6 20 L -12 28 Z" fill={SLATE} opacity={0.75} />

            {/* Label */}
            <text
              x={0}
              y={70}
              fill={CERE}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3}
              textAnchor="middle"
            >
              DETAIL A
            </text>
            <text
              x={0}
              y={85}
              fill={SLATE}
              fontFamily={inter}
              fontSize={9}
              fontWeight={500}
              letterSpacing={2}
              textAnchor="middle"
            >
              NARIS TUBERCLE
            </text>
          </g>
        </g>

        {/* Speed dial — bottom-left */}
        <g transform={`translate(${DIAL.cx}, ${DIAL.cy})`}>
          <circle
            cx={0}
            cy={0}
            r={DIAL.r}
            fill={INK}
            stroke={SLATE_DIM}
            strokeWidth={1.2}
          />
          <circle
            cx={0}
            cy={0}
            r={DIAL.r - 6}
            fill="none"
            stroke={GRID_MAJOR}
            strokeWidth={1}
          />
          {/* Ticks */}
          {Array.from({ length: 17 }).map((_, i) => {
            const d = -135 + i * (270 / 16);
            const r = (d * Math.PI) / 180;
            const x1 = Math.cos(r) * (DIAL.r - 10);
            const y1 = Math.sin(r) * (DIAL.r - 10);
            const x2 = Math.cos(r) * (DIAL.r - 2);
            const y2 = Math.sin(r) * (DIAL.r - 2);
            const isMajor = i % 4 === 0;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? SLATE : SLATE_DIM}
                strokeWidth={isMajor ? 1.6 : 0.8}
              />
            );
          })}
          {/* Numeric labels 0, 100, 200, 300, 400 (every 4 ticks over 270°) */}
          {[0, 100, 200, 300, 400].map((v, i) => {
            const d = -135 + i * (270 / 4);
            const r = (d * Math.PI) / 180;
            const x = Math.cos(r) * (DIAL.r - 28);
            const y = Math.sin(r) * (DIAL.r - 28) + 4;
            return (
              <text
                key={v}
                x={x}
                y={y}
                fill={SLATE}
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={1}
                textAnchor="middle"
              >
                {v}
              </text>
            );
          })}
          {/* Yellow "peregrine zone" arc from 300 to 400 */}
          {(() => {
            const startDeg = -135 + (300 / 400) * 270;
            const endDeg = -135 + (400 / 400) * 270;
            const sr = (startDeg * Math.PI) / 180;
            const er = (endDeg * Math.PI) / 180;
            const sx = Math.cos(sr) * (DIAL.r - 3);
            const sy = Math.sin(sr) * (DIAL.r - 3);
            const ex = Math.cos(er) * (DIAL.r - 3);
            const ey = Math.sin(er) * (DIAL.r - 3);
            return (
              <path
                d={`M ${sx} ${sy} A ${DIAL.r - 3} ${DIAL.r - 3} 0 0 1 ${ex} ${ey}`}
                fill="none"
                stroke={CERE}
                strokeWidth={3}
                opacity={0.85}
              />
            );
          })()}
          {/* Needle */}
          <g transform={`rotate(${needleDeg})`}>
            <line
              x1={-14}
              y1={0}
              x2={DIAL.r - 12}
              y2={0}
              stroke={CERE}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            <circle cx={0} cy={0} r={5} fill={CERE} />
            <circle cx={0} cy={0} r={2} fill={INK} />
          </g>
          {/* Readout */}
          <text
            x={0}
            y={22}
            fill={CREAM}
            fontFamily={inter}
            fontSize={22}
            fontWeight={600}
            letterSpacing={0.5}
            textAnchor="middle"
          >
            {airspeed}
          </text>
          <text
            x={0}
            y={38}
            fill={SLATE}
            fontFamily={inter}
            fontSize={9}
            fontWeight={500}
            letterSpacing={2.5}
            textAnchor="middle"
          >
            KM · H⁻¹
          </text>
        </g>

        {/* Caption strip below frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={SLATE}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · STOOP FLIGHT PROFILE, TERMINAL VELOCITY</text>
          <text x={FRAME.w} textAnchor="end" fill={CERE} opacity={0.85}>
            FALCO PEREGRINUS
          </text>
        </g>
      </svg>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 930,
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
            color: CERE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: SLATE, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Stunt Pilot
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.98,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The 389 km/h test pilot
          <br />
          with its own inlet cone.
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
          In its hunting stoop, the peregrine falcon (
          <span style={{ color: CERE, fontWeight: 600 }}>
            Falco peregrinus
          </span>
          ) reaches ~389 km/h — the fastest speed ever measured for a living
          animal — while a bony tubercle inside each nostril slows the ramming
          airflow into a controlled vortex so it can still breathe.
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
          color: SLATE,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Franklin skydive test · trained falcon "Frightful" · 2005</span>
        <span>
          <span style={{ color: CERE }}>●</span> Cere · signal yellow
        </span>
      </div>
    </AbsoluteFill>
  );
};
