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

// ── Palette (from the concept's visual brief) ────────────────────────────
const INK = "#141009";
const BOARD = "#1B1610";
const CHESTNUT = "#3F2E20";
const CHESTNUT_HI = "#8A6338";
const GOLD = "#C8B58C";
const GOLD_HI = "#E9E1CE";
const GRAY = "#8A8578";
const GRID = "#221D14";
const GRID_MAJOR = "#2C251A";

// ── Spectrogram data ─────────────────────────────────────────────────────
// 24 amplitude values, grouped into 6 bands of 4 bars — each band a
// distinct mimicked sound source. Amplitudes are hand-shaped so each
// band reads as a different spectrogram silhouette.
const BAND_SIZE = 4;
const AMPS: number[] = [
  // KOOKABURRA — loud broadband cackle
  0.72, 0.9, 0.83, 0.78,
  // WHIPBIRD — soft ramp, sharp whip terminal note
  0.4, 0.52, 0.98, 0.6,
  // GREY SHRIKE-THRUSH — melodic mid
  0.62, 0.7, 0.58, 0.66,
  // SATIN BOWERBIRD — chattery mechanical
  0.55, 0.78, 0.5, 0.72,
  // PILOTBIRD — moderate three-note phrase
  0.68, 0.75, 0.6, 0.5,
  // YELLOW-TAILED BLACK-COCKATOO — harsh two-note call
  0.94, 0.72, 0.86, 0.55,
];

type Band = { label: string; sub: string };
const BANDS: Band[] = [
  { label: "KOOKABURRA", sub: "0:04" },
  { label: "WHIPBIRD", sub: "0:11" },
  { label: "SHRIKE-THRUSH", sub: "0:17" },
  { label: "BOWERBIRD", sub: "0:23" },
  { label: "PILOTBIRD", sub: "0:29" },
  { label: "COCKATOO", sub: "0:35" },
];

// ── Lyre-tail geometry ───────────────────────────────────────────────────
const N = AMPS.length; // 24
const BASE_Y = 720;
const TOP_Y = 210;
const H = BASE_Y - TOP_Y; // 510

const BOT_LEFT_X = 410;
const BOT_RIGHT_X = 670;
const TOP_LEFT_X = 240;
const TOP_RIGHT_X = 840;

const xBottom = (i: number): number =>
  BOT_LEFT_X + (i / (N - 1)) * (BOT_RIGHT_X - BOT_LEFT_X);
const xTopFull = (i: number): number =>
  TOP_LEFT_X + (i / (N - 1)) * (TOP_RIGHT_X - TOP_LEFT_X);

// Trapezoidal string: leans outward proportionally to its amplitude.
const stringPath = (i: number, amp: number): string => {
  const xb = xBottom(i);
  const wB = 1.6;
  const xt = xb + (xTopFull(i) - xb) * amp;
  const wT = 2.4;
  const yT = BASE_Y - amp * H;
  return `M ${xb - wB} ${BASE_Y} L ${xb + wB} ${BASE_Y} L ${xt + wT} ${yT} L ${
    xt - wT
  } ${yT} Z`;
};

// Small circle at the tip of each string ("filamentary tuft").
const tipXY = (i: number, amp: number): { x: number; y: number } => {
  const xb = xBottom(i);
  return {
    x: xb + (xTopFull(i) - xb) * amp,
    y: BASE_Y - amp * H,
  };
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Overall paint-in for the strings: staggered spring, left-to-right.
  const barProgress = (i: number): number => {
    const delay = fps * (0.35 + i * 0.05); // ~55f delay for last bar
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 22, stiffness: 130, mass: 0.9 },
    });
  };

  // Band labels + arm reveal, after strings finish.
  const bandsInStart = fps * 1.9;
  const bandOpacity = (i: number): number =>
    interpolate(
      frame,
      [bandsInStart + i * 4, bandsInStart + i * 4 + 14],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

  const armProgress = spring({
    frame: frame - fps * 0.15,
    fps,
    config: { damping: 40, stiffness: 90, mass: 1.2 },
  });

  // Type reveal
  const titleSpring = spring({
    frame: frame - fps * 2.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 3.0, fps * 3.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Playhead sweep (loops after strings are drawn)
  const playheadStart = fps * 3.2;
  const playheadCycle = fps * 4;
  const playheadX = (() => {
    if (frame < playheadStart) return null;
    const t = ((frame - playheadStart) % playheadCycle) / playheadCycle;
    return TOP_LEFT_X + t * (TOP_RIGHT_X - TOP_LEFT_X);
  })();

  const FRAME = { x: 60, y: 130, w: 960, h: 700 };

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
        <span style={{ color: GOLD }}>2026 · 07 · 16</span>
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

          <radialGradient id="board-vignette" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#221B12" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="stage-glow" cx="50%" cy="88%" r="55%">
            <stop offset="0%" stopColor={CHESTNUT_HI} stopOpacity={0.22} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="string-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={CHESTNUT_HI} />
            <stop offset="60%" stopColor={GOLD} />
            <stop offset="100%" stopColor={GOLD_HI} />
          </linearGradient>

          <linearGradient id="arm-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#2A1E15" />
            <stop offset="70%" stopColor={CHESTNUT} />
            <stop offset="100%" stopColor={CHESTNUT_HI} />
          </linearGradient>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Studio card */}
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
          stroke="#332A1D"
          strokeWidth={1}
        />

        {/* Stage-glow behind the tail */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#stage-glow)"
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
          <g key={i} stroke={CHESTNUT_HI} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Frequency axis (only 3 marks, tucked inside the card) */}
        <g
          stroke={GRID_MAJOR}
          strokeWidth={1}
          fill={GRAY}
          fontFamily={inter}
          fontSize={9}
          letterSpacing={2}
          fontWeight={500}
        >
          {[
            { y: TOP_Y + 30, hz: "8k" },
            { y: TOP_Y + H * 0.5, hz: "4k" },
            { y: BASE_Y - 4, hz: "0" },
          ].map((t, i) => (
            <g key={i}>
              <line x1={125} y1={t.y} x2={140} y2={t.y} />
              <text x={120} y={t.y + 3} textAnchor="end" stroke="none">
                {t.hz}
              </text>
            </g>
          ))}
          <text
            x={100}
            y={(TOP_Y + BASE_Y) / 2}
            textAnchor="middle"
            transform={`rotate(-90 100 ${(TOP_Y + BASE_Y) / 2})`}
            stroke="none"
            letterSpacing={4}
          >
            HZ
          </text>
        </g>

        {/* Band labels above the lyre + tick marks */}
        {BANDS.map((b, bi) => {
          const centerI = bi * BAND_SIZE + (BAND_SIZE - 1) / 2;
          const cx = xTopFull(centerI);
          const op = bandOpacity(bi);
          return (
            <g key={b.label} opacity={op}>
              <line
                x1={cx}
                y1={188}
                x2={cx}
                y2={196}
                stroke={GOLD}
                strokeWidth={1}
              />
              <text
                x={cx}
                y={178}
                textAnchor="middle"
                fill={GOLD_HI}
                fontFamily={inter}
                fontSize={10}
                fontWeight={600}
                letterSpacing={1.8}
              >
                {b.label}
              </text>
              <text
                x={cx}
                y={162}
                textAnchor="middle"
                fill={GRAY}
                fontFamily={inter}
                fontSize={9}
                fontWeight={500}
                letterSpacing={2}
              >
                {b.sub}
              </text>
            </g>
          );
        })}

        {/* Divider ticks between bands, along the caption strip */}
        {[0, 1, 2, 3, 4, 5, 6].map((k) => {
          // divider positions in the top-arc coord: between band k-1 and k
          const iCut = k * BAND_SIZE - 0.5;
          const cutX = xTopFull(Math.max(0, Math.min(N - 1, iCut)));
          const op = bandOpacity(Math.min(5, k));
          return (
            <line
              key={`div-${k}`}
              x1={cutX}
              y1={196}
              x2={cutX}
              y2={202}
              stroke={CHESTNUT_HI}
              strokeWidth={1}
              opacity={0.6 * op}
            />
          );
        })}

        {/* Left arm (chestnut outer feather) */}
        <g opacity={armProgress}>
          <path
            d="M 400 720
               C 340 640, 260 470, 210 260
               C 205 220, 232 200, 268 218"
            fill="none"
            stroke="url(#arm-grad)"
            strokeWidth={16}
            strokeLinecap="round"
          />
          <path
            d="M 400 720
               C 340 640, 260 470, 210 260
               C 205 220, 232 200, 268 218"
            fill="none"
            stroke={CHESTNUT_HI}
            strokeWidth={3}
            strokeLinecap="round"
            strokeOpacity={0.85}
          />
          {/* Rachis fine hairs on left arm */}
          {Array.from({ length: 10 }).map((_, i) => {
            const t = 0.15 + i * 0.075;
            const bx = 400 + (210 - 400) * t + Math.sin(t * 3) * 6;
            const by = 720 + (260 - 720) * t;
            return (
              <line
                key={`lh-${i}`}
                x1={bx}
                y1={by}
                x2={bx - 22 + i * 0.6}
                y2={by - 6}
                stroke={CHESTNUT_HI}
                strokeWidth={1}
                strokeOpacity={0.55}
              />
            );
          })}
        </g>

        {/* Right arm (mirror) */}
        <g opacity={armProgress}>
          <path
            d="M 680 720
               C 740 640, 820 470, 870 260
               C 875 220, 848 200, 812 218"
            fill="none"
            stroke="url(#arm-grad)"
            strokeWidth={16}
            strokeLinecap="round"
          />
          <path
            d="M 680 720
               C 740 640, 820 470, 870 260
               C 875 220, 848 200, 812 218"
            fill="none"
            stroke={CHESTNUT_HI}
            strokeWidth={3}
            strokeLinecap="round"
            strokeOpacity={0.85}
          />
          {Array.from({ length: 10 }).map((_, i) => {
            const t = 0.15 + i * 0.075;
            const bx = 680 + (870 - 680) * t - Math.sin(t * 3) * 6;
            const by = 720 + (260 - 720) * t;
            return (
              <line
                key={`rh-${i}`}
                x1={bx}
                y1={by}
                x2={bx + 22 - i * 0.6}
                y2={by - 6}
                stroke={CHESTNUT_HI}
                strokeWidth={1}
                strokeOpacity={0.55}
              />
            );
          })}
        </g>

        {/* Base cross-bar (perch/rachis) */}
        <g opacity={armProgress}>
          <rect
            x={385}
            y={716}
            width={310}
            height={9}
            rx={3}
            fill="url(#arm-grad)"
          />
          <rect x={385} y={716} width={310} height={2} rx={1} fill={CHESTNUT_HI} />
          {/* time ticks on the crossbar */}
          {Array.from({ length: 7 }).map((_, i) => {
            const x = 385 + i * (310 / 6);
            return (
              <line
                key={`tk-${i}`}
                x1={x}
                y1={728}
                x2={x}
                y2={i % 3 === 0 ? 734 : 731}
                stroke={GRAY}
                strokeWidth={1}
              />
            );
          })}
        </g>

        {/* Strings (spectrogram) */}
        <g filter="url(#soft-glow)">
          {AMPS.map((amp, i) => {
            const p = Math.max(0, Math.min(1, barProgress(i)));
            const drawn = amp * p;
            if (drawn < 0.01) return null;
            const tip = tipXY(i, drawn);
            return (
              <g key={`bar-${i}`}>
                <path
                  d={stringPath(i, drawn)}
                  fill="url(#string-grad)"
                  opacity={0.95}
                />
                <circle cx={tip.x} cy={tip.y} r={2.6} fill={GOLD_HI} />
              </g>
            );
          })}
        </g>

        {/* Playhead sweep */}
        {playheadX !== null && (
          <g>
            <line
              x1={playheadX}
              y1={TOP_Y - 8}
              x2={playheadX}
              y2={BASE_Y + 6}
              stroke={GOLD_HI}
              strokeWidth={1.2}
              strokeOpacity={0.55}
            />
            <circle cx={playheadX} cy={TOP_Y - 8} r={3} fill={GOLD_HI} />
          </g>
        )}

        {/* Compact bird silhouette below the lyre — the source */}
        <g opacity={armProgress}>
          {/* body — slim oval, back rising toward tail */}
          <path
            d="M 490 776
               Q 480 762 500 758
               Q 530 750 555 758
               Q 568 762 566 772
               Q 560 782 530 785
               Q 505 785 490 776 Z"
            fill="#0A0704"
          />
          {/* neck — thin and extended */}
          <path
            d="M 558 762 Q 572 754 582 749 L 587 754 Q 578 762 562 768 Z"
            fill="#0A0704"
          />
          {/* head */}
          <ellipse cx={588} cy={748} rx={9.5} ry={9} fill="#0A0704" />
          {/* small crest */}
          <path
            d="M 588 740 L 590 733 L 594 741 Z"
            fill="#0A0704"
          />
          {/* beak — slender */}
          <polygon points="596,748 610,750 596,752" fill={CHESTNUT_HI} />
          {/* eye */}
          <circle cx={591} cy={747} r={1.5} fill={GOLD_HI} />
          {/* legs — long */}
          <line x1={514} y1={784} x2={514} y2={805} stroke="#0A0704" strokeWidth={2.2} />
          <line x1={534} y1={784} x2={534} y2={805} stroke="#0A0704" strokeWidth={2.2} />
          {/* feet */}
          <path d="M 507 805 L 521 805 M 514 805 L 514 810" stroke="#0A0704" strokeWidth={2.2} />
          <path d="M 527 805 L 541 805 M 534 805 L 534 810" stroke="#0A0704" strokeWidth={2.2} />
        </g>

        {/* Species tag under the bird */}
        <g opacity={interpolate(frame, [fps * 2.0, fps * 2.7], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}>
          <line
            x1={420}
            y1={822}
            x2={478}
            y2={822}
            stroke={CHESTNUT_HI}
            strokeWidth={1}
            strokeOpacity={0.55}
          />
          <line
            x1={602}
            y1={822}
            x2={660}
            y2={822}
            stroke={CHESTNUT_HI}
            strokeWidth={1}
            strokeOpacity={0.55}
          />
          <text
            x={540}
            y={825}
            textAnchor="middle"
            fill={GOLD}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={4.5}
            fontWeight={600}
          >
            MENURA NOVAEHOLLANDIAE
          </text>
        </g>

        {/* Caption strip below the studio card */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 3 · TAIL DISPLAY AS SPECTROGRAM OF THE MIMICRY SET</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={GOLD}
            opacity={0.85}
          >
            ≈72% OF RECITAL IS IMITATION
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
            color: GOLD,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EFEADC", letterSpacing: 5 }}>
            Foley Artist
          </span>
        </div>

        <div
          style={{
            color: "#F5EFDF",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.95,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The peer-reviewed
          <br />
          impersonator.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#D6D1C1",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          An adult male superb lyrebird spends roughly{" "}
          <span style={{ color: GOLD, fontWeight: 600 }}>72% of his recital</span>{" "}
          producing high-fidelity imitations of at least twenty other bird
          species — mimicry so faithful the spectrograms overlay onto the
          source calls.
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
        <span>Zann & Dunstan · Anim. Behav. 76 (2008) 1043–1054</span>
        <span>
          <span style={{ color: GOLD }}>●</span> String = Mimicked Call
        </span>
      </div>

      {/* Suppress unused-var warning for duration */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
