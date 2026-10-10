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

// Palette — from the concept's visual brief (real obsidian coloration)
const VOID = "#09090C";
const BASALT = "#15161B";
const BASALT_LIFT = "#1C1D23";
const STEEL = "#B9BEC8";
const EMBER = "#D45530";
const EMBER_HOT = "#F6B079";
const RAINBOW = "#5B7FA6";
const GRAY = "#7E8390";
const GRID = "#1A1C22";
const GRID_MAJOR = "#242730";

// ── Drafting frame (page coord space 1080×1350) ──────────────────────────
const FRAME = { x: 60, y: 130, w: 960, h: 711 };

// ── Blade coord space (960×711, same aspect) ─────────────────────────────
// Blade geometry: an asymmetric conchoidal flake oriented along a diagonal
// from the lower-left strike point up to the sharp tip in the upper-right.
// Coordinates are chosen so the "strike point" (percussion bulb) sits near
// the heel and the thin edge runs along the top-right.
const STRIKE = { x: 215, y: 540 }; // percussion / striking point (heel)
const TIP = { x: 820, y: 150 };    // sharp distal tip
const EDGE_SPINE: Array<[number, number]> = [
  // leading edge — the surgical edge, slightly concave
  [215, 540],
  [285, 455],
  [370, 380],
  [470, 315],
  [575, 260],
  [690, 210],
  [775, 180],
  [820, 150],
];
const BACK_SPINE: Array<[number, number]> = [
  // trailing (thick) back of the flake, more irregular
  [215, 540],
  [230, 605],
  [285, 650],
  [370, 665],
  [475, 650],
  [585, 615],
  [680, 560],
  [755, 480],
  [800, 395],
  [820, 290],
  [820, 150],
];

const toPath = (
  pts: Array<[number, number]>,
  close: boolean,
  smooth = 0.18,
): string => {
  if (pts.length < 2) return "";
  const parts: string[] = [`M ${pts[0][0]} ${pts[0][1]}`];
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[Math.min(i + 1, pts.length - 1)];
    const [pprevX, pprevY] = pts[Math.max(0, i - 2)];
    const c1x = px + (cx - pprevX) * smooth;
    const c1y = py + (cy - pprevY) * smooth;
    const c2x = cx - (nx - px) * smooth;
    const c2y = cy - (ny - py) * smooth;
    parts.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${cx} ${cy}`);
  }
  if (close) parts.push("Z");
  return parts.join(" ");
};

const bladeOutline = (): string => {
  const forward = EDGE_SPINE;
  const back = [...BACK_SPINE].reverse();
  const combined: Array<[number, number]> = [...forward, ...back.slice(1)];
  return toPath(combined, true, 0.22);
};

const edgePath = toPath(EDGE_SPINE, false, 0.22);

// Interior fracture ridges — subtle lines following the conchoidal ripples
const RIDGES: Array<Array<[number, number]>> = [
  [
    [255, 530],
    [330, 465],
    [420, 400],
    [520, 345],
    [620, 300],
    [710, 265],
    [785, 240],
  ],
  [
    [285, 580],
    [370, 530],
    [460, 475],
    [560, 420],
    [660, 370],
    [740, 335],
  ],
  [
    [335, 615],
    [430, 575],
    [530, 525],
    [625, 475],
    [705, 430],
  ],
];

// Conchoidal rings — concentric arcs around the strike point. We render them
// as full ellipses rotated along the blade's long axis and clipped by the
// blade outline, so each ring reads as a shell-fracture wavefront.
const RING_COUNT = 9;
const BLADE_AXIS_DEG = (() => {
  const dx = TIP.x - STRIKE.x;
  const dy = TIP.y - STRIKE.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
})();

// Fine ticks for the micrometre callout ruler
const TICKS = Array.from({ length: 11 }, (_, i) => i);

export const ObsidianSurgeon: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const t = frame / fps; // seconds

  // Spring progressions
  const bladeSpring = spring({
    frame,
    fps,
    config: { damping: 180, mass: 1.1, stiffness: 60 },
  });
  const ripplesSpring = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 160, mass: 1.4, stiffness: 55 },
  });
  const annotationSpring = spring({
    frame: frame - fps * 1.1,
    fps,
    config: { damping: 200, mass: 1 },
  });
  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Specular glint traces the edge from heel to tip, driven by eased time
  const glintProgress = interpolate(
    frame,
    [fps * 1.4, fps * 4.0],
    [0, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Compute a point along the edge spine at parameter u ∈ [0,1]
  const pointAlongEdge = (u: number): [number, number] => {
    // simple polyline length parameterisation
    const segLens: number[] = [];
    let total = 0;
    for (let i = 1; i < EDGE_SPINE.length; i++) {
      const [ax, ay] = EDGE_SPINE[i - 1];
      const [bx, by] = EDGE_SPINE[i];
      const l = Math.hypot(bx - ax, by - ay);
      segLens.push(l);
      total += l;
    }
    const target = u * total;
    let acc = 0;
    for (let i = 0; i < segLens.length; i++) {
      if (acc + segLens[i] >= target) {
        const f = (target - acc) / segLens[i];
        const [ax, ay] = EDGE_SPINE[i];
        const [bx, by] = EDGE_SPINE[i + 1];
        return [ax + (bx - ax) * f, ay + (by - ay) * f];
      }
      acc += segLens[i];
    }
    return EDGE_SPINE[EDGE_SPINE.length - 1];
  };

  const [glintX, glintY] = pointAlongEdge(0.1 + glintProgress * 0.88);

  const MAP_W = 960;
  const MAP_H = 711;
  const scale = FRAME.w / MAP_W;

  // Annotation line: from mid-leading-edge out into negative space above
  const TIP_ANCHOR_U = 0.62;
  const [tipAx, tipAy] = pointAlongEdge(TIP_ANCHOR_U);
  // Outward normal at that point (rough: use neighbor difference)
  const [tipAx2, tipAy2] = pointAlongEdge(TIP_ANCHOR_U + 0.01);
  const nxRaw = -(tipAy2 - tipAy);
  const nyRaw = tipAx2 - tipAx;
  const nL = Math.hypot(nxRaw, nyRaw) || 1;
  const nxN = nxRaw / nL;
  const nyN = nyRaw / nL;
  const callStart: [number, number] = [tipAx, tipAy];
  const callElbow: [number, number] = [tipAx + nxN * 68, tipAy + nyN * 68];
  // Lock the callout block inside the plate margins (block is ~290 wide)
  const CALL_MAX_X = MAP_W - 310;
  const callEnd: [number, number] = [
    Math.min(callElbow[0] + 120, CALL_MAX_X),
    Math.max(callElbow[1] - 30, 60),
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: VOID, fontFamily: inter }}>
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
        <span style={{ color: EMBER }}>2026 · 10 · 10</span>
      </div>

      {/* Drafting frame + plate */}
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

          <radialGradient id="plate-vignette" cx="46%" cy="40%" r="72%">
            <stop offset="0%" stopColor="#171920" stopOpacity={1} />
            <stop offset="100%" stopColor={BASALT} stopOpacity={1} />
          </radialGradient>

          {/* Blade body: deep volcanic black with a cool-iridescent core and
              a mahogany lower-left bias — reads as volcanic glass, not plastic */}
          <linearGradient
            id="blade-body"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor={VOID} />
            <stop offset="42%" stopColor={BASALT_LIFT} />
            <stop offset="72%" stopColor="#101217" />
            <stop offset="100%" stopColor={VOID} />
          </linearGradient>

          {/* Iridescent sheen band — rainbow obsidian, aligned with the long axis */}
          <linearGradient
            id="iridescence"
            x1="0.1"
            y1="0.0"
            x2="0.95"
            y2="0.8"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor={RAINBOW} stopOpacity={0} />
            <stop offset="30%" stopColor={RAINBOW} stopOpacity={0.16} />
            <stop offset="55%" stopColor="#8A6CA6" stopOpacity={0.1} />
            <stop offset="78%" stopColor={EMBER} stopOpacity={0.08} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0} />
          </linearGradient>

          <linearGradient
            id="edge-ember"
            x1="0"
            y1="0"
            x2="1"
            y2="0.3"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor={EMBER} stopOpacity={0.1} />
            <stop offset="55%" stopColor={EMBER_HOT} stopOpacity={0.9} />
            <stop offset="100%" stopColor={EMBER} stopOpacity={0.0} />
          </linearGradient>

          <radialGradient id="strike-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={RAINBOW} stopOpacity={0.45} />
            <stop offset="100%" stopColor={RAINBOW} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="blade-clip">
            <path d={bladeOutline()} />
          </clipPath>
        </defs>

        {/* Drafting plate */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#plate-vignette)"
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
          <g key={i} stroke={EMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate ID — top-left */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 38})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text>PLATE III · INSTRUMENT STUDY</text>
        </g>

        {/* Material tag — top-right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 38})`}
          fill={EMBER}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="end">SiO₂ · AMORPHOUS · n = 1.50</text>
        </g>

        {/* ── Blade stage ────────────────────────────────────────────── */}
        <g transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}>
          <g
            style={{
              transformOrigin: `${STRIKE.x}px ${STRIKE.y}px`,
              transform: `translate(0px, ${(1 - bladeSpring) * 24}px)`,
              opacity: bladeSpring,
            }}
          >
            {/* Soft shadow pool under the blade */}
            <ellipse
              cx={(STRIKE.x + TIP.x) / 2}
              cy={(STRIKE.y + TIP.y) / 2 + 18}
              rx={360}
              ry={28}
              fill="#000"
              opacity={0.42}
              filter="url(#soft-glow)"
            />

            {/* Blade body */}
            <path d={bladeOutline()} fill="url(#blade-body)" />
            {/* Iridescent sheen (clipped) */}
            <g clipPath="url(#blade-clip)">
              <rect
                x={0}
                y={0}
                width={MAP_W}
                height={MAP_H}
                fill="url(#iridescence)"
              />

              {/* Conchoidal rings — concentric around strike point */}
              {Array.from({ length: RING_COUNT }, (_, i) => {
                const r = 60 + i * 72;
                const delay = i * 0.05;
                const local = Math.max(0, ripplesSpring - delay);
                const op = Math.min(1, local * 2) * (1 - i / (RING_COUNT + 2));
                return (
                  <ellipse
                    key={`ring-${i}`}
                    cx={STRIKE.x}
                    cy={STRIKE.y}
                    rx={r}
                    ry={r * 0.42}
                    transform={`rotate(${BLADE_AXIS_DEG} ${STRIKE.x} ${STRIKE.y})`}
                    fill="none"
                    stroke={STEEL}
                    strokeWidth={1.1}
                    strokeOpacity={0.14 * op}
                  />
                );
              })}

              {/* A few sharper fracture ridges following the ripple curves */}
              {RIDGES.map((pts, i) => (
                <path
                  key={`ridge-${i}`}
                  d={toPath(pts, false, 0.25)}
                  fill="none"
                  stroke={STEEL}
                  strokeOpacity={0.18 - i * 0.03}
                  strokeWidth={1.1}
                  strokeLinecap="round"
                />
              ))}

              {/* Strike-point percussion bulb glow */}
              <circle
                cx={STRIKE.x}
                cy={STRIKE.y}
                r={70}
                fill="url(#strike-glow)"
              />
              <circle
                cx={STRIKE.x}
                cy={STRIKE.y}
                r={5}
                fill={RAINBOW}
                opacity={0.6}
              />

              {/* Faint highlight along the back curve to suggest form */}
              <path
                d={toPath(BACK_SPINE, false, 0.2)}
                fill="none"
                stroke={STEEL}
                strokeOpacity={0.09}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </g>

            {/* Blade outline stroke — crisp, slightly brighter at the edge */}
            <path
              d={toPath(BACK_SPINE, false, 0.2)}
              fill="none"
              stroke="#000"
              strokeOpacity={0.9}
              strokeWidth={1.5}
            />
            <path
              d={edgePath}
              fill="none"
              stroke={STEEL}
              strokeOpacity={0.55}
              strokeWidth={1.2}
              strokeLinecap="round"
            />
            {/* Ember kiss along the edge — the "still-hot" freshly fractured line */}
            <path
              d={edgePath}
              fill="none"
              stroke="url(#edge-ember)"
              strokeOpacity={0.95}
              strokeWidth={3.2}
              strokeLinecap="round"
              filter="url(#soft-glow)"
            />
            <path
              d={edgePath}
              fill="none"
              stroke={EMBER_HOT}
              strokeOpacity={0.65}
              strokeWidth={1.1}
              strokeLinecap="round"
            />

            {/* Specular glint travelling the edge */}
            <g opacity={bladeSpring}>
              <circle
                cx={glintX}
                cy={glintY}
                r={22}
                fill={EMBER_HOT}
                opacity={0.22}
                filter="url(#soft-glow)"
              />
              <circle
                cx={glintX}
                cy={glintY}
                r={4}
                fill="#FFF8EC"
              />
            </g>
          </g>

          {/* ── Annotation / technical callout ──────────────────────── */}
          <g opacity={annotationSpring}>
            {/* Leader line */}
            <circle
              cx={callStart[0]}
              cy={callStart[1]}
              r={3}
              fill={STEEL}
            />
            <line
              x1={callStart[0]}
              y1={callStart[1]}
              x2={callElbow[0]}
              y2={callElbow[1]}
              stroke={STEEL}
              strokeOpacity={0.7}
              strokeWidth={1}
            />
            <line
              x1={callElbow[0]}
              y1={callElbow[1]}
              x2={callEnd[0]}
              y2={callEnd[1]}
              stroke={STEEL}
              strokeOpacity={0.7}
              strokeWidth={1}
            />

            {/* Callout block — pinned above the leader elbow */}
            <g
              transform={`translate(${callEnd[0] + 10}, ${callEnd[1] - 46})`}
              fill={STEEL}
              fontFamily={inter}
            >
              {/* small index rule above the block to anchor the eye */}
              <line
                x1={0}
                y1={-14}
                x2={56}
                y2={-14}
                stroke={EMBER}
                strokeWidth={1.4}
              />
              <text
                x={0}
                y={0}
                fontSize={10}
                fontWeight={600}
                letterSpacing={3}
                fill={EMBER}
              >
                EDGE RADIUS
              </text>
              <text
                x={0}
                y={38}
                fontSize={38}
                fontWeight={600}
                fill="#F2F2F4"
                fontFamily={inter}
                letterSpacing={-0.5}
              >
                r ≈ 3 nm
              </text>
              <text
                x={0}
                y={60}
                fontSize={11}
                fontWeight={500}
                letterSpacing={2.4}
                fill={GRAY}
              >
                ~30 Å · ≈100× FINER
              </text>
              <text
                x={0}
                y={76}
                fontSize={11}
                fontWeight={500}
                letterSpacing={2.4}
                fill={GRAY}
              >
                THAN SURGICAL STEEL
              </text>
            </g>

            {/* Micrometre scale bar — lower-left of the plate, well below the heel */}
            <g transform={`translate(60, ${MAP_H - 72})`}>
              <text
                x={0}
                y={-18}
                fill={EMBER}
                fontFamily={inter}
                fontSize={10}
                fontWeight={600}
                letterSpacing={3}
              >
                NANOMETRE SCALE · 0 ─ 10 nm
              </text>
              <line x1={0} y1={0} x2={240} y2={0} stroke={STEEL} strokeWidth={1.1} />
              {TICKS.map((i) => (
                <line
                  key={`tick-${i}`}
                  x1={i * 24}
                  y1={-5}
                  x2={i * 24}
                  y2={i % 5 === 0 ? 7 : 3}
                  stroke={STEEL}
                  strokeWidth={1.1}
                />
              ))}
              {/* Marker at ~3 nm — label below so it never collides */}
              <g transform={`translate(${3 * 24}, 0)`}>
                <polygon points="0,14 -6,22 6,22" fill={EMBER_HOT} />
                <text
                  x={0}
                  y={40}
                  textAnchor="middle"
                  fill={EMBER_HOT}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={600}
                  letterSpacing={1.6}
                >
                  OBSIDIAN · 3 nm
                </text>
              </g>
              {/* "Steel · 300 nm →" marker — placed off-scale to the right as a comparison */}
              <g transform={`translate(260, 0)`}>
                <text
                  x={0}
                  y={4}
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={500}
                  letterSpacing={1.6}
                >
                  STEEL · 300 nm →
                </text>
              </g>
            </g>
          </g>
        </g>

        {/* Caption strip below the plate */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · CONCHOIDAL FLAKE, VOLCANIC GLASS · DISTAL EDGE</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={EMBER}
            opacity={0.85}
          >
            INSTRUMENT GRADE
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
            color: EMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Surgeon</span>
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
          The glass that cuts
          <br />
          between cells.
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
          Because volcanic glass has no crystal grain to stop a crack, a
          conchoidally fractured{" "}
          <span style={{ color: EMBER, fontWeight: 600 }}>obsidian</span>{" "}
          flake can hold an edge whose tip radius is on the order of{" "}
          <span style={{ color: EMBER_HOT, fontWeight: 600 }}>3 nm</span> —
          roughly a hundred times finer than a stainless-steel scalpel.
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
        <span>Buck · West J Med 136 (1982) 265 · Disa et al. · Ann Plast Surg 1993</span>
        <span>
          <span style={{ color: EMBER }}>●</span> Strike bulb = Percussion
        </span>
      </div>

      {/* Silence an "unused" lint if durationInFrames isn't referenced */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
