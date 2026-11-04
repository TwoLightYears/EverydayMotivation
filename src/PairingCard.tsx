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

// ── Palette (from concept brief) ─────────────────────────────────────────
const INK = "#081423";         // deep ocean background
const INK_DEEP = "#040A14";    // vignette corners
const PLATE = "#0E1D30";       // plate surface
const BLOOD = "#1A6E9A";       // hemocyanin blue
const BLOOD_HI = "#9BD4EE";    // specular / highlight
const CARAPACE = "#B68A4E";    // chitin bronze
const CARAPACE_DK = "#7A5B2F"; // deep bronze
const PARCHMENT = "#D9C58A";   // warm sand type
const GRID = "#152638";        // grid rule

// Horseshoe crab top-down anatomical silhouette.
// 1000×1000 local coord space, centred at (500, 500), facing UP (telson down).
// Based on Limulus polyphemus dorsal proportions:
//   Prosoma: broad horseshoe (W ≈ 760, H ≈ 360), with rear "lobes" past the hinge
//   Opisthosoma: hexagonal plate (W ≈ 540 at top, tapering), with lateral spines
//   Telson: long thin spine (~240 px)
const PROSOMA_Y_HINGE = 490;
const OPISTHO_Y_TOP = 500;
const OPISTHO_Y_BOT = 720;
const TELSON_Y_TIP = 965;

// Prosoma outline — a broad U/horseshoe facing up, with rear lobes
const prosomaPath = (): string => {
  return [
    // Start at rear-right lobe tip
    "M 850 520",
    // Rear-right lobe curves outward then forward to the widest point
    "C 862 500 870 480 870 445",
    // Right side curves up and around to the front
    "C 870 320 760 200 500 200",
    // Front arc — mirror
    "C 240 200 130 320 130 445",
    // Left side curves back down to rear-left lobe
    "C 130 480 138 500 150 520",
    // Rear-left notch going inward
    "L 230 515",
    "C 265 510 295 500 320 490",
    // Rear edge inward curve (the hinge zone, concave)
    "C 370 500 430 508 500 508",
    "C 570 508 630 500 680 490",
    // Rear-right coming back out
    "C 705 500 735 510 770 515",
    "L 850 520",
    "Z",
  ].join(" ");
};

// Opisthosoma outline — hexagonal plate with lateral spines
const opisthoPath = (): string => {
  return [
    // Start top-left (slightly inset from prosoma rear edge)
    "M 290 510",
    // Top edge — gentle convex
    "C 370 505 630 505 710 510",
    // Right shoulder then taper down with notched spines
    "L 740 560",
    "L 720 605",
    "L 695 655",
    "L 655 695",
    "L 605 725",
    // Right telson joint
    "L 555 735",
    "L 500 740",
    "L 445 735",
    "L 395 725",
    // Left side mirror
    "L 345 695",
    "L 305 655",
    "L 280 605",
    "L 260 560",
    "Z",
  ].join(" ");
};

// Telson tail — a long tapering spine (filled triangle plus centre line)
const telsonPath = (): string => {
  return [
    "M 485 738",
    "L 500 735",
    "L 515 738",
    "L 508 940",
    "L 500 965",
    "L 492 940",
    "Z",
  ].join(" ");
};

// Prosoma cardiac ridge (central dome)
const cardiacRidge = (): string => {
  return [
    "M 500 270",
    "C 560 270 600 320 600 390",
    "C 600 455 560 490 500 490",
    "C 440 490 400 455 400 390",
    "C 400 320 440 270 500 270",
    "Z",
  ].join(" ");
};

// Compound lateral eyes — small, set outside the cardiac ridge
const eyes: Array<[number, number]> = [
  [370, 340],
  [630, 340],
];

// Segmentation lines across opisthosoma
const opisthoSegments: Array<string> = [
  "M 320 548 Q 500 540 680 548",
  "M 335 585 Q 500 578 665 585",
  "M 355 620 Q 500 614 645 620",
  "M 380 655 Q 500 649 620 655",
  "M 410 688 Q 500 684 590 688",
];

// Lateral spines (small outward flares along the opisthosoma edges)
const lateralSpines: Array<[number, number, number, number]> = [
  [740, 560, 758, 556],
  [720, 605, 740, 602],
  [695, 655, 715, 653],
  [655, 695, 672, 695],
  [260, 560, 242, 556],
  [280, 605, 260, 602],
  [305, 655, 285, 653],
  [345, 695, 328, 695],
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Animation drivers ─────────────────────────────────────────────────
  // Plate reveals first, then drop forms, falls, lands, fills vial, pulse radiates.
  const plateIn = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const crabIn = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 180, mass: 1 },
  });

  // Drop forms at the hinge of the crab, then falls into the vial.
  // Time windows (seconds): form 0.9-1.5, fall 1.5-2.4, splash 2.4-2.6, fill 2.4-3.4
  const dropFormT = interpolate(frame, [fps * 0.9, fps * 1.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dropFallT = interpolate(frame, [fps * 1.5, fps * 2.4], [0, 1], {
    easing: Easing.bezier(0.55, 0.0, 0.35, 1.0),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const splashT = interpolate(frame, [fps * 2.35, fps * 2.75], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fillT = interpolate(frame, [fps * 2.5, fps * 3.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulse once the assay confirms
  const pulseT = interpolate(frame, [fps * 3.6, fps * 4.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Type block
  const titleSpring = spring({
    frame: frame - fps * 0.55,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.2, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page layout (1080 × 1350 portrait) ─────────────────────────────────
  // Top metadata band: 0..110
  // Specimen plate     : 130..880 (h 750, w 920) — the drop falls within this
  // Title block        : 915..
  // Hook               : ~1095..
  // Footer             : 1290..
  const FRAME = { x: 80, y: 130, w: 920, h: 750 };

  // Crab path lives in 1000-wide coord; fit it into FRAME with margin.
  // We want the crab centered horizontally and sized so the telson tip sits around
  // 620px down in local coord space — leaving room for the vial below the crab
  // within the plate.
  const CRAB_SCALE = 0.56; // 1000 * 0.56 = 560 tall? actually plate uses 170..985 so 815 tall
  // We'll draw crab in its own local coord space then scale to fit.
  const crabW = 1000 * CRAB_SCALE;
  const crabH = 815 * CRAB_SCALE;
  const crabX = FRAME.x + (FRAME.w - crabW) / 2;
  const crabY = FRAME.y + 60; // top padding

  // Drop origin — right-side hinge point of the crab, scaled into FRAME coordinates
  const HINGE_LOCAL = { x: 745, y: 530 };
  const dropOriginX = crabX + HINGE_LOCAL.x * CRAB_SCALE;
  const dropOriginY = crabY + HINGE_LOCAL.y * CRAB_SCALE;

  // Vial position — right of plate centre, below the crab
  const VIAL = {
    x: FRAME.x + FRAME.w - 170,
    y: FRAME.y + FRAME.h - 220,
    w: 86,
    h: 180,
  };
  const vialRimY = VIAL.y;
  const vialBottomY = VIAL.y + VIAL.h;

  // Drop trajectory: from origin to vial rim centre
  const DROP_END_X = VIAL.x + VIAL.w / 2;
  const DROP_END_Y = vialRimY - 6;
  const dropX =
    dropOriginX + (DROP_END_X - dropOriginX) * dropFallT;
  const dropY =
    dropOriginY + (DROP_END_Y - dropOriginY) * dropFallT;
  const dropR = 7 + dropFormT * 3 - dropFallT * 2;
  const dropVisible =
    dropFormT > 0 && dropFallT < 1 ? 1 : dropFallT >= 1 ? 0 : dropFormT;

  // Vial fill — liquid rises from bottom to about 55% of vial height
  const fillLevel = fillT * (VIAL.h * 0.55);
  const liquidY = vialBottomY - fillLevel;

  // Concentric pulse rings centered on vial
  const pulseCX = VIAL.x + VIAL.w / 2;
  const pulseCY = vialBottomY - VIAL.h * 0.28;

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
          color: PARCHMENT,
          opacity: 0.68,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: BLOOD_HI, letterSpacing: 4.5 }}>
          2026 · 11 · 04
        </span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="grid-pat"
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
              opacity={0.75}
            />
          </pattern>

          <radialGradient id="plate-vignette" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor={PLATE} />
            <stop offset="100%" stopColor={INK_DEEP} />
          </radialGradient>

          <linearGradient id="carapace-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={CARAPACE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={CARAPACE_DK} stopOpacity={0.14} />
          </linearGradient>

          <radialGradient id="cardiac-fill" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={CARAPACE} stopOpacity={0.5} />
            <stop offset="100%" stopColor={CARAPACE_DK} stopOpacity={0.15} />
          </radialGradient>

          <linearGradient id="blood-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={BLOOD_HI} stopOpacity={0.9} />
            <stop offset="30%" stopColor={BLOOD} />
            <stop offset="100%" stopColor="#0C3E5A" />
          </linearGradient>

          <radialGradient id="drop-grad" cx="35%" cy="25%" r="70%">
            <stop offset="0%" stopColor={BLOOD_HI} />
            <stop offset="55%" stopColor={BLOOD} />
            <stop offset="100%" stopColor="#0C3E5A" />
          </radialGradient>

          <filter id="blood-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip region: plate interior — keeps pulse rings inside the frame */}
          <clipPath id="plate-clip">
            <rect
              x={FRAME.x + 1}
              y={FRAME.y + 1}
              width={FRAME.w - 2}
              height={FRAME.h - 2}
            />
          </clipPath>
        </defs>

        {/* Specimen plate background */}
        <g opacity={plateIn}>
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
            fill="url(#grid-pat)"
          />
          {/* Thin plate border */}
          <rect
            x={FRAME.x + 0.5}
            y={FRAME.y + 0.5}
            width={FRAME.w - 1}
            height={FRAME.h - 1}
            fill="none"
            stroke={CARAPACE_DK}
            strokeOpacity={0.7}
            strokeWidth={1}
          />
          {/* Corner marks */}
          {(
            [
              [FRAME.x, FRAME.y, 1, 1],
              [FRAME.x + FRAME.w, FRAME.y, -1, 1],
              [FRAME.x, FRAME.y + FRAME.h, 1, -1],
              [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
            ] as const
          ).map(([cx, cy, sx, sy], i) => (
            <g key={i} stroke={PARCHMENT} strokeWidth={1.4} fill="none" opacity={0.85}>
              <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
              <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
            </g>
          ))}

          {/* Top-left plate label */}
          <g
            transform={`translate(${FRAME.x + 24}, ${FRAME.y + 36})`}
            fill={PARCHMENT}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={600}
            opacity={0.85}
          >
            <text>PLATE III · DORSAL VIEW</text>
            <text y={16} fill={PARCHMENT} opacity={0.55} fontWeight={500}>
              Limulus polyphemus
            </text>
          </g>

          {/* Top-right specimen metadata */}
          <g
            transform={`translate(${FRAME.x + FRAME.w - 24}, ${FRAME.y + 36})`}
            fill={PARCHMENT}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={600}
            textAnchor="end"
            opacity={0.85}
          >
            <text>CHELICERATA · XIPHOSURA</text>
            <text y={16} fill={PARCHMENT} opacity={0.55} fontWeight={500}>
              c. 450 Ma — Ordovician
            </text>
          </g>
        </g>

        {/* ── Crab silhouette ──────────────────────────────────────────── */}
        <g
          transform={`translate(${crabX}, ${crabY}) scale(${CRAB_SCALE})`}
          opacity={crabIn}
        >
          {/* Drop shadow for depth (prosoma + opisthosoma + telson together) */}
          <g transform="translate(5, 9)" opacity={0.3}>
            <path d={prosomaPath()} fill={CARAPACE_DK} />
            <path d={opisthoPath()} fill={CARAPACE_DK} />
            <path d={telsonPath()} fill={CARAPACE_DK} />
          </g>

          {/* Opisthosoma (behind) */}
          <path
            d={opisthoPath()}
            fill="url(#carapace-fill)"
            stroke={CARAPACE}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />

          {/* Telson (behind prosoma, overlaps opisthosoma slightly) */}
          <path
            d={telsonPath()}
            fill={CARAPACE_DK}
            opacity={0.85}
            stroke={CARAPACE}
            strokeWidth={1.2}
          />

          {/* Prosoma (front shield, overlaps opisthosoma at hinge) */}
          <path
            d={prosomaPath()}
            fill="url(#carapace-fill)"
            stroke={CARAPACE}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />

          {/* Prosoma cardiac ridge (central dome) */}
          <path
            d={cardiacRidge()}
            fill="url(#cardiac-fill)"
            stroke={CARAPACE}
            strokeWidth={1.6}
            opacity={0.95}
          />

          {/* Central longitudinal ridge of the prosoma */}
          <line
            x1={500}
            y1={280}
            x2={500}
            y2={480}
            stroke={CARAPACE}
            strokeWidth={1.4}
            opacity={0.65}
          />

          {/* Two lateral cephalic ridges (echo the central dome) */}
          <path
            d="M 330 320 Q 320 420 345 490"
            stroke={CARAPACE}
            strokeWidth={1.2}
            fill="none"
            opacity={0.5}
          />
          <path
            d="M 670 320 Q 680 420 655 490"
            stroke={CARAPACE}
            strokeWidth={1.2}
            fill="none"
            opacity={0.5}
          />

          {/* Simple ocelli pair at top (median eyes) */}
          <g opacity={0.8}>
            <circle cx={485} cy={295} r={3} fill={CARAPACE_DK} stroke={CARAPACE} strokeWidth={0.8} />
            <circle cx={515} cy={295} r={3} fill={CARAPACE_DK} stroke={CARAPACE} strokeWidth={0.8} />
          </g>

          {/* Lateral compound eyes */}
          {eyes.map(([ex, ey], i) => (
            <g key={`eye-${i}`}>
              <ellipse
                cx={ex}
                cy={ey}
                rx={11}
                ry={6}
                fill={CARAPACE_DK}
                stroke={CARAPACE}
                strokeWidth={1.3}
                transform={`rotate(${i === 0 ? -20 : 20}, ${ex}, ${ey})`}
              />
              <circle cx={ex} cy={ey - 1} r={2} fill={BLOOD_HI} opacity={0.55} />
            </g>
          ))}

          {/* Opisthosoma segmentation chevrons */}
          {opisthoSegments.map((d, i) => (
            <path
              key={`seg-${i}`}
              d={d}
              stroke={CARAPACE}
              strokeWidth={1.3}
              fill="none"
              opacity={0.6}
            />
          ))}

          {/* Lateral spines */}
          {lateralSpines.map(([x1, y1, x2, y2], i) => (
            <line
              key={`sp-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={CARAPACE}
              strokeWidth={1.5}
              opacity={0.85}
            />
          ))}

          {/* Hinge/extraction annotation point — subtle circle on the right hinge */}
          <circle
            cx={HINGE_LOCAL.x}
            cy={HINGE_LOCAL.y}
            r={5}
            fill={BLOOD}
            stroke={BLOOD_HI}
            strokeWidth={1.5}
            opacity={0.95 * crabIn}
          />
          <circle
            cx={HINGE_LOCAL.x}
            cy={HINGE_LOCAL.y}
            r={12}
            fill="none"
            stroke={BLOOD_HI}
            strokeWidth={1}
            opacity={0.35 * crabIn}
          />
        </g>

        {/* ── Annotation: extraction leader from the hinge ───────────── */}
        <g opacity={crabIn * 0.9}>
          <line
            x1={dropOriginX + 4}
            y1={dropOriginY - 2}
            x2={dropOriginX + 70}
            y2={dropOriginY - 46}
            stroke={BLOOD_HI}
            strokeWidth={1}
            opacity={0.6}
          />
          <text
            x={dropOriginX + 76}
            y={dropOriginY - 46}
            fill={BLOOD_HI}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={2.5}
            opacity={0.85}
          >
            ARTHRODIAL EXTRACTION
          </text>
          <text
            x={dropOriginX + 76}
            y={dropOriginY - 30}
            fill={PARCHMENT}
            fontFamily={inter}
            fontSize={10}
            fontWeight={400}
            letterSpacing={2}
            opacity={0.55}
          >
            AMEBOCYTES · HEMOCYANIN
          </text>
        </g>

        {/* ── The Vial ───────────────────────────────────────────────── */}
        <g opacity={plateIn}>
          {/* Vial outer glass */}
          {/* Neck */}
          <rect
            x={VIAL.x + VIAL.w / 2 - 16}
            y={VIAL.y - 22}
            width={32}
            height={22}
            fill={PLATE}
            stroke={PARCHMENT}
            strokeOpacity={0.55}
            strokeWidth={1.4}
          />
          {/* Rim */}
          <rect
            x={VIAL.x + VIAL.w / 2 - 20}
            y={VIAL.y - 26}
            width={40}
            height={6}
            fill={PARCHMENT}
            opacity={0.65}
          />
          {/* Body */}
          <rect
            x={VIAL.x}
            y={VIAL.y}
            width={VIAL.w}
            height={VIAL.h}
            rx={6}
            fill={PLATE}
            stroke={PARCHMENT}
            strokeOpacity={0.7}
            strokeWidth={1.6}
          />

          {/* Liquid fill (clipped to vial body) */}
          <defs>
            <clipPath id="vial-clip">
              <rect
                x={VIAL.x + 3}
                y={VIAL.y + 3}
                width={VIAL.w - 6}
                height={VIAL.h - 6}
                rx={5}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#vial-clip)">
            <rect
              x={VIAL.x + 3}
              y={liquidY}
              width={VIAL.w - 6}
              height={vialBottomY - liquidY}
              fill="url(#blood-liquid)"
            />
            {/* Meniscus highlight */}
            <ellipse
              cx={VIAL.x + VIAL.w / 2}
              cy={liquidY + 2}
              rx={(VIAL.w - 8) / 2}
              ry={3}
              fill={BLOOD_HI}
              opacity={0.75}
            />
          </g>

          {/* Vial tick marks */}
          {[0.25, 0.5, 0.75].map((f, i) => (
            <line
              key={`tick-${i}`}
              x1={VIAL.x + VIAL.w}
              y1={VIAL.y + VIAL.h - f * VIAL.h}
              x2={VIAL.x + VIAL.w + 7}
              y2={VIAL.y + VIAL.h - f * VIAL.h}
              stroke={PARCHMENT}
              strokeOpacity={0.7}
              strokeWidth={1.2}
            />
          ))}

          {/* Vial label */}
          <g
            transform={`translate(${VIAL.x + VIAL.w / 2}, ${VIAL.y + VIAL.h + 24})`}
            textAnchor="middle"
            fontFamily={inter}
          >
            <text
              fill={BLOOD_HI}
              fontSize={11}
              fontWeight={600}
              letterSpacing={3}
            >
              LAL ASSAY
            </text>
            <text
              y={16}
              fill={PARCHMENT}
              opacity={0.65}
              fontSize={10}
              fontWeight={500}
              letterSpacing={2}
            >
              0.005 EU / mL
            </text>
          </g>
        </g>

        {/* ── Falling drop ─────────────────────────────────────────────── */}
        {dropVisible > 0 && dropR > 0 && (
          <g opacity={dropVisible}>
            <circle
              cx={dropX}
              cy={dropY}
              r={dropR + 4}
              fill={BLOOD}
              opacity={0.2}
              filter="url(#blood-glow)"
            />
            <circle
              cx={dropX}
              cy={dropY}
              r={dropR}
              fill="url(#drop-grad)"
            />
            {/* Tiny specular */}
            <circle
              cx={dropX - dropR * 0.3}
              cy={dropY - dropR * 0.35}
              r={Math.max(0, dropR * 0.3)}
              fill={BLOOD_HI}
              opacity={0.75}
            />
          </g>
        )}

        {/* Splash ring when drop lands */}
        {splashT > 0 && splashT < 1 && (
          <g opacity={1 - splashT}>
            <ellipse
              cx={DROP_END_X}
              cy={DROP_END_Y + 4}
              rx={4 + splashT * 22}
              ry={1.5 + splashT * 5}
              fill="none"
              stroke={BLOOD_HI}
              strokeWidth={1.5}
            />
          </g>
        )}

        {/* ── Confirmation pulse rings (clipped to the plate) ─────────── */}
        {pulseT > 0 && (
          <g clipPath="url(#plate-clip)">
            {[0, 0.33, 0.66].map((off, i) => {
              const localT = (pulseT + off) % 1;
              const r = 18 + localT * 210;
              const op = (1 - localT) * 0.4;
              return (
                <circle
                  key={`pulse-${i}`}
                  cx={pulseCX}
                  cy={pulseCY}
                  r={r}
                  fill="none"
                  stroke={BLOOD_HI}
                  strokeWidth={1.1}
                  opacity={op}
                />
              );
            })}
          </g>
        )}

        {/* ── APPROVED seal (lower-left of plate) ─────────────────────── */}
        <g
          transform={`translate(${FRAME.x + 100}, ${FRAME.y + FRAME.h - 130}) rotate(-8)`}
          opacity={interpolate(fillT, [0.5, 1], [0, 0.92], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          <circle
            cx={0}
            cy={0}
            r={54}
            fill="none"
            stroke={BLOOD_HI}
            strokeWidth={2.4}
            opacity={0.85}
          />
          <circle
            cx={0}
            cy={0}
            r={46}
            fill="none"
            stroke={BLOOD_HI}
            strokeWidth={1}
            opacity={0.55}
          />
          <text
            textAnchor="middle"
            y={-8}
            fill={BLOOD_HI}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3}
          >
            USP 85
          </text>
          <text
            textAnchor="middle"
            y={12}
            fill={BLOOD_HI}
            fontFamily={inter}
            fontSize={16}
            fontWeight={700}
            letterSpacing={2.5}
          >
            PASSED
          </text>
          <text
            textAnchor="middle"
            y={30}
            fill={BLOOD_HI}
            fontFamily={inter}
            fontSize={8}
            fontWeight={500}
            letterSpacing={2.5}
            opacity={0.7}
          >
            FDA · 1977
          </text>
        </g>

        {/* Caption strip just below the plate */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 24})`}
          fill={PARCHMENT}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={0.7}
        >
          <text>FIG. 1 · HEMOCYANIN-BASED STERILITY ASSAY</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={BLOOD_HI}
            opacity={0.95}
          >
            EVERY INJECTABLE DRUG ON EARTH
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
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
            color: BLOOD_HI,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: PARCHMENT, opacity: 0.55, margin: "0 4px" }}>/</span>
          <span style={{ color: "#F2EEDA", letterSpacing: 5 }}>
            Quality Assurance Inspector
          </span>
        </div>

        <div
          style={{
            color: "#F2EEDA",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The 450-million-year-old
          <br />
          inspector.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#D9CFB1",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          The horseshoe crab's copper-based{" "}
          <span style={{ color: BLOOD_HI, fontWeight: 600 }}>
            blue blood
          </span>{" "}
          clots on contact with bacterial endotoxins at concentrations as low
          as 0.005 EU/mL — the LAL assay has been the US Pharmacopeia standard
          for sterility-testing every injectable drug and vaccine since 1977.
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
          color: PARCHMENT,
          opacity: 0.6,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>USP &lt;85&gt; · 21 CFR 610.9 · FDA 1977</span>
        <span>
          <span style={{ color: BLOOD_HI }}>●</span> Hemocyanin ≠ Hemoglobin
        </span>
      </div>
    </AbsoluteFill>
  );
};
