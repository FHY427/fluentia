export function worldArt(worldId) {
  if (worldId === 'daily') {
    return `<svg class="world-svg" viewBox="0 0 620 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="daily-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f3c9a8"/><stop offset="0.55" stop-color="#eaa07d"/><stop offset="1" stop-color="#d96f52"/>
        </linearGradient>
        <linearGradient id="daily-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#244c39"/><stop offset="1" stop-color="#123024"/>
        </linearGradient>
      </defs>
      <rect width="620" height="260" fill="url(#daily-bg)"/>
      <circle cx="492" cy="66" r="70" fill="#ffe4b8" opacity=".75"/>
      <path d="M0 188c95-45 190-39 291-8 113 35 214 14 329-29v109H0Z" fill="url(#daily-table)"/>
      <g opacity=".2" fill="none" stroke="#fff" stroke-width="1.4">
        <circle cx="78" cy="58" r="22"/><circle cx="112" cy="74" r="9"/><circle cx="560" cy="170" r="30"/>
      </g>
      <g transform="translate(196 104)">
        <ellipse cx="116" cy="92" rx="116" ry="13" fill="#0a2117" opacity=".28"/>
        <path d="M27 13h146v58c0 27-22 48-49 48H76c-27 0-49-21-49-48Z" fill="#f7efe1"/>
        <path d="M173 27h18c23 0 33 18 25 35-7 15-22 20-43 18" fill="none" stroke="#f7efe1" stroke-width="17" stroke-linecap="round"/>
        <ellipse cx="100" cy="13" rx="73" ry="12" fill="#e2d4bd"/>
        <ellipse cx="100" cy="11" rx="59" ry="8" fill="#5b3424"/>
        <path d="M76-16c8-12-6-18 0-30M108-16c8-12-6-18 0-30" stroke="#fff3df" stroke-width="4" stroke-linecap="round" opacity=".75"/>
      </g>
      <g transform="translate(428 174) rotate(-8)">
        <rect x="0" y="0" width="84" height="46" rx="8" fill="#f5d8b9"/>
        <path d="M13 15h44M13 25h30" stroke="#a66148" stroke-width="3" stroke-linecap="round"/>
      </g>
      <g fill="#f7ecdc" opacity=".7">
        <circle cx="76" cy="148" r="3"/><circle cx="98" cy="132" r="2"/><circle cx="536" cy="96" r="3"/>
      </g>
    </svg>`;
  }

  if (worldId === 'campus') {
    return `<svg class="world-svg" viewBox="0 0 620 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="campus-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#bfd4b6"/><stop offset=".6" stop-color="#7fa487"/><stop offset="1" stop-color="#446d58"/>
        </linearGradient>
      </defs>
      <rect width="620" height="260" fill="url(#campus-bg)"/>
      <circle cx="118" cy="66" r="42" fill="#f2e6c9" opacity=".8"/>
      <path d="M0 260V174c68-27 128-28 191-5 55 20 98 18 148-2 65-26 122-25 187-4 37 12 67 14 94 9v88Z" fill="#e8e1cc"/>
      <g fill="#23452f">
        <path d="M58 260V143c0-35 28-64 64-64s64 29 64 64v117Z"/>
        <path d="M270 260V126c0-46 37-83 83-83s83 37 83 83v134Z"/>
      </g>
      <g fill="#d7e2cd">
        <path d="M80 260V146c0-23 19-42 42-42s42 19 42 42v114Z"/>
        <path d="M295 260V129c0-32 26-58 58-58s58 26 58 58v131Z"/>
      </g>
      <g fill="#2d5138" opacity=".9">
        <rect x="98" y="159" width="48" height="101" rx="24"/>
        <rect x="312" y="149" width="82" height="111" rx="41"/>
      </g>
      <path d="M0 216h620" stroke="#b9ab8c" stroke-width="2" opacity=".45"/>
      <g transform="translate(478 78)">
        <path d="M0 24 46 0l46 24-46 24Z" fill="#f3eee3"/>
        <path d="M17 32v17c0 8 13 14 29 14s29-6 29-14V32" fill="none" stroke="#f3eee3" stroke-width="5"/>
      </g>
      <g fill="none" stroke="#f1ead8" stroke-width="1.5" opacity=".4">
        <path d="M210 44c8 12 8 24 0 36"/><path d="M198 50c6 9 6 18 0 27"/>
      </g>
    </svg>`;
  }

  if (worldId === 'play') {
    return `<svg class="world-svg" viewBox="0 0 620 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="play-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3b4a89"/><stop offset=".55" stop-color="#5f5aa8"/><stop offset="1" stop-color="#a06a9a"/>
        </linearGradient>
      </defs>
      <rect width="620" height="260" fill="url(#play-bg)"/>
      <circle cx="512" cy="62" r="94" fill="#f0a66a" opacity=".65"/>
      <g transform="translate(64 52) rotate(-10)">
        <rect width="210" height="142" rx="18" fill="#151c3c" opacity=".85"/>
        <rect x="12" y="14" width="186" height="114" rx="8" fill="none" stroke="#f3eee3" stroke-width="2" opacity=".35"/>
        <g fill="#f3eee3" opacity=".75">
          <rect x="24" y="24" width="16" height="20" rx="2"/><rect x="24" y="56" width="16" height="20" rx="2"/><rect x="24" y="88" width="16" height="20" rx="2"/>
          <rect x="170" y="24" width="16" height="20" rx="2"/><rect x="170" y="56" width="16" height="20" rx="2"/><rect x="170" y="88" width="16" height="20" rx="2"/>
        </g>
        <path d="m92 52 34 20-34 20Z" fill="#f0a66a"/>
      </g>
      <g transform="translate(378 104)">
        <circle cx="64" cy="64" r="64" fill="#17162c"/>
        <circle cx="64" cy="64" r="52" fill="none" stroke="#f3eee3" stroke-width="1" opacity=".28"/>
        <circle cx="64" cy="64" r="25" fill="#e46a4f"/>
        <circle cx="64" cy="64" r="8" fill="#17162c"/>
        <circle cx="64" cy="64" r="43" fill="none" stroke="#f3eee3" stroke-width="1" opacity=".18"/>
      </g>
      <g fill="#f3eee3" opacity=".8">
        <circle cx="300" cy="210" r="4"/><circle cx="544" cy="188" r="5"/><circle cx="320" cy="48" r="3"/>
      </g>
      <path d="M296 42c18 12 31 12 49 0" stroke="#f3eee3" fill="none" stroke-width="1.5" opacity=".5"/>
    </svg>`;
  }

  return `<svg class="world-svg" viewBox="0 0 620 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="custom-bg" cx=".5" cy=".4" r=".8">
        <stop offset="0" stop-color="#315844"/><stop offset=".55" stop-color="#152e23"/><stop offset="1" stop-color="#0c1b14"/>
      </radialGradient>
      <linearGradient id="custom-line" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#e46a4f"/><stop offset="1" stop-color="#e9b15e"/>
      </linearGradient>
    </defs>
    <rect width="620" height="260" fill="url(#custom-bg)"/>
    <g fill="none" stroke="#f3eee3" opacity=".16">
      <ellipse cx="440" cy="132" rx="168" ry="86" transform="rotate(-20 440 132)"/>
      <ellipse cx="440" cy="132" rx="118" ry="118" opacity=".7"/>
      <ellipse cx="440" cy="132" rx="62" ry="118" transform="rotate(55 440 132)" opacity=".5"/>
    </g>
    <circle cx="440" cy="132" r="34" fill="url(#custom-line)"/>
    <circle cx="558" cy="88" r="8" fill="#f3eee3"/>
    <circle cx="330" cy="182" r="5" fill="#e46a4f"/>
    <g transform="translate(58 72)" fill="none" stroke="#f3eee3" stroke-width="1.4" opacity=".5">
      <path d="M0 40h64M8 60h44M18 20h28"/>
    </g>
    <g fill="#f3eee3" opacity=".85">
      <circle cx="90" cy="190" r="2"/><circle cx="120" cy="202" r="2"/><circle cx="150" cy="190" r="2"/>
    </g>
    <text x="58" y="164" fill="#f3eee3" opacity=".5" font-family="Georgia, serif" font-size="14" font-style="italic">make your own room</text>
  </svg>`;
}
