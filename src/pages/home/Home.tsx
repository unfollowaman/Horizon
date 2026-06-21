import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#FEFEFE] flex items-center justify-center overflow-hidden">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1440" className="w-full max-w-[800px] h-auto max-h-[1440px]">
        <defs>
          {/* Custom CSS to handle fonts and smooth rendering */}
          <style>
            {`
              .font-brand {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-weight: 900;
                letter-spacing: -2px;
              }
              .font-subbrand {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-weight: 700;
                letter-spacing: -0.5px;
              }
              .font-title {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-weight: 800;
                letter-spacing: -1.5px;
              }
              .font-item-title {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-weight: 700;
                letter-spacing: -0.3px;
              }
              .font-body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-weight: 500;
              }
              .sketch-line {
                stroke: #111111;
                stroke-linecap: round;
                stroke-linejoin: round;
                fill: none;
              }
              .grid-line {
                stroke: #D0D4DC;
                stroke-width: 1.2;
              }
              .accent-red {
                fill: #E31B23;
              }
              .accent-red-stroke {
                stroke: #E31B23;
              }
            `}
          </style>
        </defs>

        {/* ================= GRID LINES & BORDERS ================= */}
        {/* Left vertical margin line */}
        <line x1="50" y1="0" x2="50" y2="1440" className="grid-line" />
        {/* Right vertical margin line */}
        <line x1="750" y1="0" x2="750" y2="1440" className="grid-line" />

        {/* Horizontal divider under Brand section */}
        <line x1="0" y1="160" x2="800" y2="160" className="grid-line" />
        {/* Red horizontal divider under Brand slogan */}
        <line x1="0" y1="230" x2="800" y2="230" className="grid-line accent-red-stroke" strokeWidth="1.2" />

        {/* ================= BRAND / HEADER ================= */}
        <g id="brand-header">
          {/* Horizon Brand Title */}
          <text x="62" y="125" className="font-brand" fontSize="82" fill="#000000">Horizon</text>
          {/* Brand Slogan */}
          <text x="62" y="196" className="font-subbrand" fontSize="28" fill="#111111">Study. Practice. Succeed.</text>
        </g>

        {/* ================= VALUE PROPOSITION SECTION ================= */}
        <g id="value-proposition">
          <text x="62" y="320" className="font-title" fontSize="46" fill="#111111">Everything you need.</text>
          <text x="62" y="375" className="font-title" fontSize="46" fill="#E31B23">All in one place.</text>
        </g>

        {/* ================= FEATURE LIST ITEMS ================= */}
        <g id="features">

          {/* ITEM 1: Study Notes */}
          <g id="item-study-notes" transform="translate(0, 420)">
            {/* Icon: Open Book */}
            <g transform="translate(68, 5)" className="sketch-line" strokeWidth="2.2">
              <path d="M 2 8 A 18 18 0 0 1 20 12 A 18 18 0 0 1 38 8" />
              <path d="M 2 34 A 18 18 0 0 1 20 38 A 18 18 0 0 1 38 34" />
              <path d="M 2 8 L 2 34" />
              <path d="M 20 12 L 20 38" />
              <path d="M 38 8 L 38 34" />
              <path d="M 6 13 A 18 18 0 0 1 16 16" />
              <path d="M 6 19 A 18 18 0 0 1 16 22" />
              <path d="M 6 25 A 18 18 0 0 1 16 28" />
            </g>
            {/* Title */}
            <text x="145" y="32" className="font-item-title" fontSize="24" fill="#111111">Study Notes</text>
            {/* Description */}
            <text x="415" y="22" className="font-body" fontSize="16.5" fill="#3A3A3A">Well-structured notes for</text>
            <text x="415" y="44" className="font-body" fontSize="16.5" fill="#3A3A3A">better understanding.</text>
            {/* Separator */}
            <line x1="62" y1="62" x2="728" y2="62" stroke="#E2E5EC" strokeWidth="1.2" />
          </g>

          {/* ITEM 2: Previous Year Papers */}
          <g id="item-previous-year-papers" transform="translate(0, 515)">
            {/* Icon: Document with Fold & Lines */}
            <g transform="translate(70, 5)" className="sketch-line" strokeWidth="2.2">
              <path d="M 4 2 L 24 2 L 34 12 L 34 38 L 4 38 Z" />
              <path d="M 24 2 L 24 12 L 34 12" />
              <line x1="9" y1="18" x2="29" y2="18" />
              <line x1="9" y1="24" x2="29" y2="24" />
              <line x1="9" y1="30" x2="21" y2="30" />
            </g>
            {/* Title */}
            <text x="145" y="32" className="font-item-title" fontSize="24" fill="#111111">Previous Year Papers</text>
            {/* Description */}
            <text x="415" y="15" className="font-body" fontSize="16.5" fill="#3A3A3A">Access past papers to know</text>
            <text x="415" y="37" className="font-body" fontSize="16.5" fill="#3A3A3A">the pattern and prepare smart.</text>
            {/* Separator */}
            <line x1="62" y1="62" x2="728" y2="62" stroke="#E2E5EC" strokeWidth="1.2" />
          </g>

          {/* ITEM 3: Study Materials */}
          <g id="item-study-materials" transform="translate(0, 610)">
            {/* Icon: Folder */}
            <g transform="translate(68, 8)" className="sketch-line" strokeWidth="2.2">
              <path d="M 2 6 L 12 6 L 16 11 L 38 11 L 38 34 L 2 34 Z" />
              <path d="M 2 15 L 38 15" />
            </g>
            {/* Title */}
            <text x="145" y="32" className="font-item-title" fontSize="24" fill="#111111">Study Materials</text>
            {/* Description */}
            <text x="415" y="15" className="font-body" fontSize="16.5" fill="#3A3A3A">Curated resources to support</text>
            <text x="415" y="37" className="font-body" fontSize="16.5" fill="#3A3A3A">your exam preparation.</text>
            {/* Separator */}
            <line x1="62" y1="62" x2="728" y2="62" stroke="#E2E5EC" strokeWidth="1.2" />
          </g>

          {/* ITEM 4: Practice Questions */}
          <g id="item-practice-questions" transform="translate(0, 705)">
            {/* Icon: Pencil */}
            <g transform="translate(68, 5)" className="sketch-line" strokeWidth="2.2">
              <path d="M 4 30 L 26 8 L 32 14 L 10 36 Z" />
              <path d="M 26 8 L 30 4 L 36 10 L 32 14" />
              <path d="M 4 30 L 2 38 L 10 36" />
              <line x1="7" y1="27" x2="13" y2="33" />
            </g>
            {/* Title */}
            <text x="145" y="32" className="font-item-title" fontSize="24" fill="#111111">Practice Questions</text>
            {/* Description */}
            <text x="415" y="15" className="font-body" fontSize="16.5" fill="#3A3A3A">Sharpen your skills with practice</text>
            <text x="415" y="37" className="font-body" fontSize="16.5" fill="#3A3A3A">questions and sets.</text>
          </g>

        </g>

        {/* ================= COMING SOON SECTION ================= */}
        <g id="coming-soon" transform="translate(0, 830)">
          <text x="62" y="60" className="font-title" fontSize="46">
            <tspan fill="#111111">Coming </tspan>
            <tspan fill="#E31B23">Soon.</tspan>
          </text>
          <text x="62" y="112" className="font-item-title" fontSize="24" fill="#111111">Something great</text>
          <text x="62" y="142" className="font-item-title" fontSize="24">
            <tspan fill="#111111">is </tspan>
            <tspan fill="#E31B23">on the horizon.</tspan>
          </text>
        </g>

        {/* ================= HAND-DRAWN WORKSPACE ILLUSTRATION ================= */}
        <g id="workspace-sketch" transform="translate(0, 960)">

          {/* DESK SURFACE & PERSPECTIVE GUIDELINES (with stippled wood grain textures) */}
          <g className="sketch-line" stroke="#222222" strokeWidth="1.2">
            {/* Desk Edge */}
            <path d="M -50 280 C 150 220, 600 230, 850 270" strokeWidth="2" />
            <path d="M -50 290 L 850 280" />
            {/* Table grain texture vectors */}
            <path d="M 50 290 L 150 285" strokeDasharray="2, 8" />
            <path d="M 230 285 L 340 282" strokeDasharray="1, 6" />
            <path d="M 400 285 L 650 280" strokeDasharray="3, 10" />
            <path d="M -20 340 L 410 325" strokeDasharray="2, 5" />
            <path d="M 450 325 L 820 315" strokeDasharray="1, 8" />
          </g>

          {/* COFFEE CUP / TUMBLER */}
          <g className="sketch-line" strokeWidth="1.2" stroke="#222222">
            {/* Shadow under coffee cup */}
            <ellipse cx="660" cy="272" rx="35" ry="10" strokeWidth="1" strokeDasharray="2, 4" />
            {/* Cup Base and Body */}
            <path d="M 628 266 L 642 165 C 642 165, 672 161, 684 158 L 696 253 C 696 253, 660 263, 628 266 Z" fill="none" strokeWidth="1.5" />
            {/* Cup Lid */}
            <path d="M 640 165 C 640 160, 686 150, 686 150 L 692 158 C 692 158, 650 171, 640 165 Z" fill="none" strokeDasharray="1 1" strokeWidth="1.8" />
            {/* Sleeve */}
            <path d="M 633 225 C 633 225, 665 218, 689 212" />
            <path d="M 636 195 C 636 195, 670 188, 691 183" />
            {/* Textured vertical hatching on cup */}
            <path d="M 648 175 L 642 220 M 658 171 L 652 216 M 668 168 L 662 212" strokeWidth="0.8" strokeDasharray="1 2" />
          </g>

          {/* LAPTOP */}
          <g className="sketch-line" strokeWidth="1.5" stroke="#111111">
            {/* Laptop shadows */}
            <path d="M 330 245 L 610 215" strokeWidth="1" strokeDasharray="2, 4" />
            <path d="M 390 268 L 560 248" strokeWidth="1.2" strokeDasharray="1, 3" />

            {/* Screen (Angled back) */}
            {/* Back Lid */}
            <path d="M 445 15 L 612 28 L 575 186 L 434 212 Z" strokeWidth="1.8" />
            {/* Display Bezel */}
            <path d="M 451 22 L 604 34 L 569 178 L 441 202 Z" />
            {/* Glare lines on Screen */}
            <line x1="470" y1="40" x2="550" y2="150" strokeWidth="0.7" strokeDasharray="2 2" />
            <line x1="490" y1="35" x2="570" y2="145" strokeWidth="0.7" strokeDasharray="1 4" />
            <line x1="455" y1="80" x2="510" y2="160" strokeWidth="0.5" />

            {/* Keyboard Base */}
            <path d="M 434 212 L 575 186 L 532 268 L 334 235 Z" strokeWidth="2" />
            {/* Trackpad */}
            <path d="M 410 241 L 468 249 L 458 259 L 402 251 Z" />

            {/* Key rows (horizontal vector lines in perspective) */}
            <path d="M 430 212 L 560 190" strokeWidth="1" />
            <path d="M 420 218 L 550 196" strokeWidth="1" />
            <path d="M 410 224 L 540 202" strokeWidth="1" />
            <path d="M 400 230 L 530 208" strokeWidth="1" />
            {/* Grid ticks for keyboard mesh sketch */}
            <path d="M 430 212 L 400 230 M 450 209 L 420 227 M 470 205 L 440 223 M 490 201 L 460 219 M 510 197 L 480 215 M 530 193 L 500 211 M 550 189 L 520 207" strokeWidth="0.8" />
          </g>

          {/* ARCHITECT DESK LAMP (Aesthetic highlight) */}
          <g className="sketch-line" strokeWidth="1.5" stroke="#111111">
            {/* Base (with 3D depth lines) */}
            <ellipse cx="698" cy="235" rx="36" ry="12" strokeWidth="2" />
            <path d="M 662 235 L 662 241 C 662 247, 734 247, 734 241 L 734 235" strokeWidth="1.8" />
            <ellipse cx="698" cy="241" rx="36" ry="12" strokeWidth="1" strokeDasharray="1 3" />
            {/* Screws on base */}
            <circle cx="698" cy="235" r="5" strokeWidth="1" />

            {/* Lower Springs / Arms */}
            <line x1="695" y1="233" x2="710" y2="108" strokeWidth="2" />
            <line x1="702" y1="231" x2="718" y2="106" strokeWidth="1" />
            {/* Spring Sketch details */}
            <path d="M 698 210 L 702 205 L 699 200 L 704 195 L 701 190 L 706 185 L 703 180 L 707 165" strokeWidth="1" />

            {/* Elbow Joint */}
            <circle cx="714" cy="107" r="8" strokeWidth="2" />
            <circle cx="714" cy="107" r="3" />

            {/* Upper Arm */}
            <line x1="714" y1="107" x2="570" y2="40" strokeWidth="2" />
            <line x1="710" y1="102" x2="566" y2="35" strokeWidth="1" />

            {/* Joint at lamp head */}
            <circle cx="568" cy="38" r="6" strokeWidth="1.8" />

            {/* Lamp Bell Dome Shade */}
            {/* Back neck */}
            <path d="M 565 35 L 545 28 L 540 38 L 558 41 Z" />
            {/* Dome Shell */}
            <path d="M 542 33 C 520 20, 480 35, 492 88 C 495 102, 510 115, 532 110 C 555 105, 560 80, 552 65 C 548 55, 545 42, 542 33 Z" strokeWidth="2" />
            {/* Opening Ellipse of Lamp (source of light) */}
            <ellipse cx="512" cy="99" rx="20" ry="8" transform="rotate(-15 512 99)" strokeWidth="1.5" />
            {/* Light bulb outline inside shade */}
            <path d="M 506 96 C 500 90, 506 82, 512 85 C 518 88, 516 96, 510 97" strokeWidth="0.8" />

            {/* Elegant Hatching on Shade for depth/metallic shine */}
            <path d="M 532 45 C 515 45, 508 55, 510 80" strokeWidth="0.8" strokeDasharray="1 3" />
            <path d="M 540 55 C 528 58, 520 68, 524 88" strokeWidth="0.8" strokeDasharray="1 4" strokeLinecap="round" />
          </g>

          {/* WRITING NOTEPAD / SPIRAL JOURNAL (At foreground-left) */}
          <g className="sketch-line" strokeWidth="1.5" stroke="#111111">
            {/* Shadow under notepad */}
            <path d="M 120 230 C 180 230, 310 210, 370 195" strokeWidth="1" strokeDasharray="2, 5" />
            <path d="M 190 282 L 340 235" strokeWidth="1.2" strokeDasharray="1, 4" />

            {/* Left Page Curve & Cover */}
            <path d="M 125 185 C 165 178, 205 168, 225 165 L 210 262 C 190 265, 140 272, 110 288 Z" fill="none" strokeWidth="1.8" />
            {/* Left Page Inner Details */}
            <path d="M 130 183 C 168 176, 202 168, 220 166 L 206 257 C 188 260, 145 267, 118 281 Z" strokeWidth="0.8" />

            {/* Right Page Curve & Cover */}
            <path d="M 230 164 C 255 160, 315 150, 355 145 L 332 238 C 292 242, 252 252, 212 262 Z" fill="none" strokeWidth="1.8" />
            {/* Right Page Inner Details */}
            <path d="M 233 162 C 258 158, 312 149, 350 144 L 329 233 C 291 237, 253 247, 215 257 Z" strokeWidth="0.8" />

            {/* Spiral Binding Hooks in Centre */}
            <path d="M 226 165 L 230 163 M 224 173 C 224 173, 229 171, 228 175 M 222 183 C 222 183, 227 181, 226 185 M 220 193 C 220 193, 225 191, 224 195 M 218 203 C 218 203, 223 201, 222 205 M 216 213 C 216 213, 221 211, 220 215 M 214 223 C 214 223, 219 221, 218 225 M 212 233 C 212 233, 217 231, 216 235 M 210 243 C 210 243, 215 241, 214 245 M 208 253 C 208 253, 213 251, 212 255" strokeWidth="2" />

            {/* Mock Text on Pages */}
            <path d="M 142 195 L 195 186 M 138 205 L 192 196 M 134 215 L 188 206 M 130 225 L 184 216 M 126 235 L 180 226 M 122 245 L 176 236 M 118 255 L 172 246" strokeWidth="0.8" strokeDasharray="1 1" />
            <path d="M 245 174 L 325 159 M 243 184 L 320 169 M 241 194 L 315 179 M 239 204 L 310 189 M 237 214 L 305 199 M 235 224 L 300 209 M 233 234 L 295 219" strokeWidth="0.8" strokeDasharray="1 1.5" />
          </g>

          {/* PENS / HIGHLIGHTERS ON THE DESK */}
          <g className="sketch-line" strokeWidth="1.2" stroke="#111111">
            {/* Ruler/Pen lying down center */}
            <path d="M 380 240 L 430 212" strokeWidth="2" />
            <path d="M 382 243 L 432 215" strokeDasharray="1 2" strokeWidth="0.8" />
            {/* Small Pencil caps & pen lying near notepad */}
            <path d="M 450 248 L 485 240 L 483 245 L 448 253 Z" />
            <path d="M 290 270 L 315 260 L 313 264 L 288 274 Z" />
          </g>

          {/* STACKS OF TEXTBOOKS (Background left) */}
          <g className="sketch-line" strokeWidth="1.2" stroke="#222222">
            {/* Shadow behind books */}
            <path d="M 60 185 C 100 185, 170 170, 190 165" strokeDasharray="1 4" strokeWidth="1" />

            {/* TOP BOOK of main stack */}
            {/* Cover */}
            <path d="M 80 120 L 195 95 L 215 110 L 98 135 Z" fill="none" strokeWidth="1.5" />
            {/* Spine */}
            <path d="M 80 120 L 98 135 L 98 147 L 80 132 Z" fill="none" />
            {/* Paper Page block edges */}
            <path d="M 195 95 L 215 110 L 215 122 L 195 107 Z" />
            <path d="M 98 135 L 215 110" />
            <path d="M 98 147 L 215 122" />

            {/* SECOND BOOK of main stack */}
            <path d="M 78 134 L 96 149 L 96 164 L 78 149 Z" />
            <path d="M 96 149 L 212 124 M 96 164 L 212 139" />
            <path d="M 212 124 L 212 139" />

            {/* THIRD BOOK of main stack */}
            <path d="M 76 150 L 94 165 L 94 182 L 76 167 Z" />
            <path d="M 94 165 L 210 140 M 94 182 L 210 157" />
            <path d="M 210 140 L 210 157" />

            {/* Shading textures on books */}
            <path d="M 83 125 L 83 131 M 86 126 L 86 132" strokeWidth="0.8" />
            <path d="M 81 139 L 81 147 M 84 140 L 84 148" strokeWidth="0.8" />
            <path d="M 79 156 L 79 164 M 82 157 L 82 165" strokeWidth="0.8" />
            <path d="M 110 132 L 205 112 M 110 144 L 205 124 M 110 160 L 205 140" strokeDasharray="2 3" strokeWidth="0.6" />

            {/* SECOND SMALLER STACK OF BOOKS (Right of main stack) */}
            {/* Top Book cover */}
            <path d="M 230 110 L 290 100 L 305 112 L 243 122 Z" />
            {/* Spine & Pages block */}
            <path d="M 230 110 L 243 122 L 243 150 L 230 138 Z" />
            <path d="M 243 122 L 305 112 L 305 140 L 243 150 Z" strokeDasharray="1 1" />
            {/* Book 2 in small stack */}
            <path d="M 228 123 L 241 135 L 241 150 L 228 138 Z" />
            {/* Shading lines on spines of small stack */}
            <path d="M 233 116 L 233 133" strokeWidth="0.7" />
            <path d="M 236 118 L 236 135" strokeWidth="0.7" />
          </g>

          {/* PEN CONTAINER / MESH POT (With pens sticking out) */}
          <g className="sketch-line" strokeWidth="1.2" stroke="#222222">
            {/* Shadow under cup */}
            <ellipse cx="205" cy="165" rx="18" ry="6" strokeWidth="1" strokeDasharray="1, 3" />

            {/* Cup Body */}
            <path d="M 190 112 L 220 108 L 215 165 L 195 167 Z" strokeWidth="1.5" />
            {/* Mesh Wireframe Hatching */}
            <path d="M 190 112 L 195 167 M 195 111 L 200 166 M 200 110 L 205 165 M 205 109 L 210 164 M 210 108 L 215 163" strokeWidth="0.6" strokeDasharray="1 1" />
            <path d="M 190 115 L 219 111 M 191 125 L 218 121 M 192 135 L 217 131 M 193 145 L 216 141 M 194 155 L 215 151" strokeWidth="0.6" strokeDasharray="1 1" />

            {/* Ruler Sticking Out */}
            <path d="M 206 108 L 222 55 L 232 58 L 214 110 Z" fill="none" strokeWidth="1.5" />
            {/* Ruler tick lines */}
            <path d="M 218 68 L 221 69 M 216 74 L 219 75 M 214 80 L 217 81 M 212 86 L 215 87 M 210 92 L 213 93 M 208 98 L 211 99 M 206 104 L 209 105" strokeWidth="0.8" />

            {/* Pencil 1 (pointing top-left) */}
            <path d="M 194 110 L 175 75 L 180 72 L 198 108" />
            <path d="M 175 75 L 171 67 L 180 72 Z" fill="none" />

            {/* Pencil 2 (pointing top-right) */}
            <path d="M 210 109 L 234 82 L 238 85 L 214 110" />
            <path d="M 234 82 L 242 77 L 238 85 Z" fill="none" />
          </g>

          {/* OFFICE CHAIR (Foreground-left overlay with dense sketch texture) */}
          <g className="sketch-line" stroke="#111111" strokeWidth="1.5">
            {/* Silhouette Profile of Chair Backrest */}
            <path d="M -50 300 C -20 280, 5 285, 30 315 C 55 345, 60 400, 40 480" strokeWidth="2.5" />

            {/* Shadow on the chair body using cross-hatch strokes */}
            <path d="M -50 320 L 10 305" strokeWidth="0.8" />
            <path d="M -50 340 L 25 320" strokeWidth="0.8" />
            <path d="M -50 360 L 35 340" strokeWidth="0.8" />
            <path d="M -40 380 L 40 360" strokeWidth="0.8" />
            <path d="M -30 400 L 42 380" strokeWidth="0.8" />
            <path d="M -20 420 L 44 400" strokeWidth="0.8" />
            <path d="M -10 440 L 42 420" strokeWidth="0.8" />
            <path d="M 0 460 L 38 440" strokeWidth="0.8" />

            {/* Reverse crossing lines to create beautiful stippled depth */}
            <path d="M -10 300 L -50 340 M 10 310 L -40 365 M 25 325 L -30 385 M 35 345 L -20 405 M 42 370 L -10 425 M 44 395 L 0 445 M 40 420 L 10 465" strokeWidth="0.6" strokeDasharray="2 2" />
          </g>

        </g>
      </svg>
    </div>
  );
};

export default Home;
