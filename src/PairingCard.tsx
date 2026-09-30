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

// ── Palette — drawn from real Magicicada septendecim coloration ──────────
const PAPER = "#F1EAD6";
const PAPER_DEEP = "#E7DEC5";
const INK = "#1A140E";
const INK_SOFT = "#3A2E20";
const EYE_RED = "#D8351B";
const WING_AMBER = "#E8912A";
const UMBER = "#7A6A55";

const YEARS = 17;

// ────────────────────────────────────────────────────────────────────────
// Cicada — dorsal view. Coordinates live in a 700×620 local box centred
// on (350, 310), rendered inside a <g transform=…> from the parent SVG.
// ────────────────────────────────────────────────────────────────────────
const Cicada: React.FC<{ eyeGlow: number }> = ({ eyeGlow }) => {
  // Wing venation — hand-tuned polylines fanning from the wing base.
  const forewingRight = [
    "M 350 240 Q 420 210 540 235 T 690 320 Q 660 355 560 360 T 400 340 Z",
  ];
  const forewingLeft = [
    "M 350 240 Q 280 210 160 235 T 10 320 Q 40 355 140 360 T 300 340 Z",
  ];
  const hindwingRight = [
    "M 360 260 Q 440 260 540 310 T 640 400 Q 580 420 500 400 T 380 355 Z",
  ];
  const hindwingLeft = [
    "M 340 260 Q 260 260 160 310 T 60 400 Q 120 420 200 400 T 320 355 Z",
  ];

  return (
    <g>
      {/* Cast shadow beneath the specimen */}
      <ellipse cx={350} cy={585} rx={230} ry={14} fill={INK} opacity={0.09} />

      {/* ── Hindwings (behind forewings) ─────────────────────── */}
      {[hindwingRight[0], hindwingLeft[0]].map((d, i) => (
        <g key={`hw-${i}`}>
          <path d={d} fill={WING_AMBER} opacity={0.22} />
          <path d={d} stroke={INK_SOFT} strokeWidth={1.1} fill="none" opacity={0.65} />
        </g>
      ))}

      {/* ── Forewings ────────────────────────────────────────── */}
      {[forewingRight[0], forewingLeft[0]].map((d, i) => (
        <g key={`fw-${i}`}>
          <path d={d} fill={WING_AMBER} opacity={0.32} />
          <path d={d} stroke={INK} strokeWidth={1.4} fill="none" />
        </g>
      ))}

      {/* Wing venation — right forewing */}
      <g stroke={INK_SOFT} strokeWidth={0.9} fill="none" opacity={0.75}>
        <path d="M 358 245 Q 440 245 540 260 T 685 320" />
        <path d="M 360 258 Q 445 268 545 285 T 680 335" />
        <path d="M 362 272 Q 450 288 550 310 T 670 348" />
        <path d="M 366 288 Q 460 310 555 335 T 655 358" />
        <path d="M 372 302 Q 470 328 555 350 T 630 360" />
        {/* Cross-veins */}
        <path d="M 430 245 Q 435 275 445 305" />
        <path d="M 490 250 Q 500 285 512 320" />
        <path d="M 555 260 Q 568 300 578 340" />
        <path d="M 615 285 Q 620 320 620 350" />
      </g>

      {/* Wing venation — left forewing (mirror) */}
      <g stroke={INK_SOFT} strokeWidth={0.9} fill="none" opacity={0.75}>
        <path d="M 342 245 Q 260 245 160 260 T 15 320" />
        <path d="M 340 258 Q 255 268 155 285 T 20 335" />
        <path d="M 338 272 Q 250 288 150 310 T 30 348" />
        <path d="M 334 288 Q 240 310 145 335 T 45 358" />
        <path d="M 328 302 Q 230 328 145 350 T 70 360" />
        <path d="M 270 245 Q 265 275 255 305" />
        <path d="M 210 250 Q 200 285 188 320" />
        <path d="M 145 260 Q 132 300 122 340" />
        <path d="M 85 285 Q 80 320 80 350" />
      </g>

      {/* ── Legs (6 total) ──────────────────────────────────── */}
      <g stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.9}>
        {/* Foreleg pair */}
        <path d="M 328 245 Q 300 260 285 285 L 275 305" />
        <path d="M 372 245 Q 400 260 415 285 L 425 305" />
        {/* Midleg pair */}
        <path d="M 322 285 Q 285 310 265 340 L 260 365" />
        <path d="M 378 285 Q 415 310 435 340 L 440 365" />
        {/* Hindleg pair */}
        <path d="M 320 335 Q 275 370 255 415 L 258 440" />
        <path d="M 380 335 Q 425 370 445 415 L 442 440" />
      </g>

      {/* ── Body: abdomen (segmented, blunt oval) ───────────── */}
      <g>
        <path
          d="M 316 300
             Q 316 360 322 400
             Q 328 445 340 475
             Q 350 490 360 475
             Q 372 445 378 400
             Q 384 360 384 300 Z"
          fill={INK}
        />
        {/* Segment ridges */}
        {[320, 340, 360, 380, 400, 420, 445].map((y, i) => {
          const inset = i * 0.9;
          const w = 34 - i * 1.6;
          return (
            <path
              key={`seg-${i}`}
              d={`M ${350 - w + inset} ${y} Q 350 ${y + 4} ${350 + w - inset} ${y}`}
              stroke={PAPER}
              strokeWidth={0.9}
              fill="none"
              opacity={0.55}
            />
          );
        })}
        {/* Warm amber midline (real cicadas show orange abdominal bands) */}
        <path
          d="M 350 300 L 350 480"
          stroke={WING_AMBER}
          strokeWidth={1.1}
          opacity={0.4}
        />
      </g>

      {/* ── Thorax (mesonotum) — the Magicicada W-marking ──── */}
      <g>
        <ellipse cx={350} cy={260} rx={44} ry={38} fill={INK} />
        {/* Signature amber "W" / cross-marking */}
        <path
          d="M 320 250 L 335 275 L 350 255 L 365 275 L 380 250"
          stroke={WING_AMBER}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.75}
        />
      </g>

      {/* ── Pronotum (behind head) ──────────────────────────── */}
      <ellipse cx={350} cy={220} rx={46} ry={22} fill={INK} />
      <path
        d="M 310 218 Q 350 232 390 218"
        stroke={WING_AMBER}
        strokeWidth={1.2}
        fill="none"
        opacity={0.55}
      />

      {/* ── Head ────────────────────────────────────────────── */}
      <ellipse cx={350} cy={195} rx={40} ry={18} fill={INK} />

      {/* Eyes — the diagnostic Magicicada red */}
      <g>
        <ellipse
          cx={318}
          cy={197}
          rx={12}
          ry={10}
          fill={EYE_RED}
          opacity={0.9 + 0.1 * eyeGlow}
        />
        <ellipse cx={318} cy={197} rx={5} ry={4} fill="#FFB199" opacity={0.7 * eyeGlow + 0.2} />
        <ellipse
          cx={382}
          cy={197}
          rx={12}
          ry={10}
          fill={EYE_RED}
          opacity={0.9 + 0.1 * eyeGlow}
        />
        <ellipse cx={382} cy={197} rx={5} ry={4} fill="#FFB199" opacity={0.7 * eyeGlow + 0.2} />

        {/* Eye halo when eyeGlow is high */}
        {eyeGlow > 0.05 && (
          <>
            <circle cx={318} cy={197} r={22} fill={EYE_RED} opacity={0.18 * eyeGlow} />
            <circle cx={382} cy={197} r={22} fill={EYE_RED} opacity={0.18 * eyeGlow} />
          </>
        )}
      </g>

      {/* Antennae — very short bristles (cicadas have short antennae) */}
      <g stroke={INK} strokeWidth={1.4} fill="none" strokeLinecap="round">
        <path d="M 330 187 Q 322 178 315 174" />
        <path d="M 370 187 Q 378 178 385 174" />
      </g>
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Plate reveal
  const plateSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.9 },
    durationInFrames: 30,
  });

  // Title reveal (slightly after plate)
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
    durationInFrames: 30,
  });

  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 17-year timeline — starts revealing at ~1.0s. 8 frames per tick.
  const timelineStart = fps * 1.0;
  const framesPerYear = 5;
  const yearFloat = (frame - timelineStart) / framesPerYear;

  // Eye glow ramps up as we approach year 17
  const yearProgress = Math.max(0, Math.min(1, yearFloat / YEARS));
  const eyeIgnite = interpolate(
    yearFloat,
    [YEARS - 1, YEARS, YEARS + 4],
    [0, 1, 0.85],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Layout — 1080 × 1350 portrait ───────────────────────────────
  const M = 80; // outer margin
  const plateTop = 140;
  const plateBottom = 820;
  const plateW = 1080 - M * 2; // 920
  const plateH = plateBottom - plateTop; // 680

  // Cicada renders in 700×620 local box, centred at plate mid-left
  const cicX = 90; // x offset inside plate
  const cicY = 40; // y offset inside plate
  const cicScale = 0.92;

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Faint paper grain */}
      <svg
        width={1080}
        height={1350}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="paper-vignette" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor={PAPER} stopOpacity={0} />
            <stop offset="100%" stopColor={PAPER_DEEP} stopOpacity={0.5} />
          </radialGradient>
          <pattern id="dots" x="0" y="0" width={6} height={6} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.4} fill={UMBER} opacity={0.28} />
          </pattern>
        </defs>
        <rect x={0} y={0} width={1080} height={1350} fill="url(#paper-vignette)" />
      </svg>

      {/* ── Top metadata band ─────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: M,
          right: M,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: UMBER,
          fontFamily: inter,
          fontSize: 12,
          letterSpacing: 4.6,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span>2026 · 09 · 30</span>
      </div>

      {/* Hairline under metadata */}
      <div
        style={{
          position: "absolute",
          top: 96,
          left: M,
          right: M,
          borderTop: `1px solid ${UMBER}`,
          opacity: 0.35,
        }}
      />

      {/* Specimen taxon */}
      <div
        style={{
          position: "absolute",
          top: 108,
          left: M,
          color: INK_SOFT,
          fontFamily: playfair,
          fontStyle: "italic",
          fontSize: 15,
          letterSpacing: 0.4,
        }}
      >
        Magicicada septendecim · Linnaeus, 1758
      </div>

      {/* ── Main plate: cicada + numeral 17 ───────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{
          position: "absolute",
          inset: 0,
          opacity: plateSpring,
        }}
      >
        {/* Large serif numeral 17 sitting behind/beside the cicada as
           the cryptographer's "key". */}
        <g opacity={0.9}>
          <text
            x={870}
            y={520}
            textAnchor="end"
            fontFamily={playfair}
            fontStyle="italic"
            fontWeight={500}
            fontSize={520}
            fill={INK}
            opacity={0.06}
          >
            17
          </text>
          {/* Small tick label above */}
          <text
            x={640}
            y={225}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={4}
            fontWeight={600}
            fill={UMBER}
          >
            BROOD X · YEAR
          </text>
          <line x1={640} y1={238} x2={870} y2={238} stroke={UMBER} strokeWidth={0.8} opacity={0.55} />
          <text
            x={870}
            y={370}
            textAnchor="end"
            fontFamily={playfair}
            fontStyle="italic"
            fontWeight={500}
            fontSize={260}
            fill={INK}
          >
            17
          </text>
          <text
            x={640}
            y={410}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={4}
            fontWeight={500}
            fill={UMBER}
          >
            YEARS · PRIME
          </text>
        </g>

        {/* Cicada plate (translated into position) */}
        <g
          transform={`translate(${M + cicX}, ${plateTop + cicY}) scale(${cicScale})`}
          style={{
            transform: `translate(${M + cicX}px, ${plateTop + cicY}px) scale(${cicScale})`,
          }}
        >
          <Cicada eyeGlow={eyeIgnite} />
        </g>

        {/* Single specimen pin mark on the pronotum (naturalist-plate convention) */}
        <g stroke={UMBER} fill="none" opacity={0.6}>
          <circle
            cx={M + cicX + 350 * cicScale}
            cy={plateTop + cicY + 220 * cicScale}
            r={3}
          />
        </g>

        {/* Corner ticks framing the plate */}
        {(
          [
            [M, plateTop, 1, 1],
            [M + plateW, plateTop, -1, 1],
            [M, plateTop + plateH, 1, -1],
            [M + plateW, plateTop + plateH, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={UMBER} strokeWidth={1} fill="none" opacity={0.7}>
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* ── 17-year timeline ──────────────────────────────────── */}
        <g>
          {(() => {
            const tlY = 870;
            const tlLeftX = M + 20;
            const tlRightX = M + plateW - 20;
            const span = tlRightX - tlLeftX;
            const step = span / (YEARS - 1);

            return (
              <>
                {/* Baseline */}
                <line
                  x1={tlLeftX}
                  y1={tlY}
                  x2={tlRightX}
                  y2={tlY}
                  stroke={UMBER}
                  strokeWidth={1}
                  opacity={0.6}
                />

                {/* Progressive filled line */}
                <line
                  x1={tlLeftX}
                  y1={tlY}
                  x2={tlLeftX + span * Math.min(1, yearProgress)}
                  y2={tlY}
                  stroke={INK}
                  strokeWidth={2}
                />

                {/* Ticks */}
                {Array.from({ length: YEARS }).map((_, i) => {
                  const year = i + 1;
                  const x = tlLeftX + i * step;
                  const activated = yearFloat >= i;
                  const isLast = year === YEARS;
                  const pop = spring({
                    frame: frame - (timelineStart + i * framesPerYear),
                    fps,
                    config: { damping: 12, mass: 0.4, stiffness: 180 },
                    durationInFrames: 20,
                  });
                  const scale = activated ? pop : 0;
                  const color = isLast && activated ? EYE_RED : INK;
                  const tickH = isLast ? 22 : 14;
                  return (
                    <g key={`tick-${i}`}>
                      <line
                        x1={x}
                        y1={tlY - tickH * scale}
                        x2={x}
                        y2={tlY}
                        stroke={color}
                        strokeWidth={isLast ? 2.5 : 1.6}
                        opacity={activated ? 1 : 0.25}
                      />
                      {/* Year label — only 1, 5, 10, 15, 17 to keep it clean */}
                      {[1, 5, 10, 15, 17].includes(year) && (
                        <text
                          x={x}
                          y={tlY + 26}
                          textAnchor="middle"
                          fontFamily={inter}
                          fontSize={11}
                          letterSpacing={2}
                          fontWeight={isLast ? 700 : 500}
                          fill={isLast && activated ? EYE_RED : UMBER}
                          opacity={activated || year !== YEARS ? 0.9 : 0.5}
                        >
                          {year.toString().padStart(2, "0")}
                        </text>
                      )}
                      {/* Emergence flare at year 17 */}
                      {isLast && activated && (
                        <>
                          <circle
                            cx={x}
                            cy={tlY - tickH}
                            r={12 * eyeIgnite}
                            fill={EYE_RED}
                            opacity={0.28 * eyeIgnite}
                          />
                          <circle
                            cx={x}
                            cy={tlY - tickH}
                            r={4}
                            fill={EYE_RED}
                          />
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Axis labels flanking the timeline */}
                <text
                  x={tlLeftX}
                  y={tlY - 28}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={3}
                  fontWeight={600}
                  fill={UMBER}
                >
                  DORMANT · UNDERGROUND
                </text>
                <text
                  x={tlRightX}
                  y={tlY - 28}
                  textAnchor="end"
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={3}
                  fontWeight={700}
                  fill={eyeIgnite > 0.3 ? EYE_RED : UMBER}
                >
                  EMERGENCE
                </text>
              </>
            );
          })()}
        </g>
      </svg>

      {/* ── Type lockup ───────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: 950,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [14, 0])}px)`,
        }}
      >
        <div
          style={{
            color: EYE_RED,
            fontFamily: inter,
            fontSize: 12,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          Role
          <span style={{ color: UMBER, margin: "0 10px" }}>/</span>
          <span style={{ color: INK, letterSpacing: 5 }}>Cryptographer</span>
        </div>

        <div
          style={{
            color: INK,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
            maxWidth: 820,
          }}
        >
          Seventeen quiet years,
          <br />
          then a chorus.
        </div>

        <div
          style={{
            marginTop: 26,
            color: INK_SOFT,
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Every brood of{" "}
          <span style={{ color: INK, fontWeight: 600 }}>
            Magicicada septendecim
          </span>{" "}
          emerges on a{" "}
          <span style={{ color: EYE_RED, fontWeight: 600 }}>
            prime-numbered cycle
          </span>{" "}
          — 13 or 17 years — so its generations share no common factor with any
          predator that reproduces on a 2-, 3-, 4-, 5- or 6-year rhythm. A
          number-theoretic key, encoded into a life history.
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          bottom: 46,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: UMBER,
          fontFamily: inter,
          fontSize: 10.5,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        <span>Goles, Schulz & Markus · Complexity 6 · 2001</span>
        <span>
          <span style={{ color: EYE_RED }}>●</span> Prime year = safe emergence
        </span>
      </div>
    </AbsoluteFill>
  );
};
