/**
 * 線画アイコン。24×24、線幅 2、端は丸。UI と図で同じ系統を使う。
 * 題材に必要なアイコンはここに足す（形は単純な幾何で描く）。
 */
const P: Record<string, string> = {
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
  users: '<circle cx="9" cy="8.5" r="3"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.8a3 3 0 0 1 0 5.4M18 14.4c1.9.8 3 2.6 3 5.1"/>',
  server: '<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7.5 7.5h.01M7.5 16.5h.01M12 7.5h4.5M12 16.5h4.5"/>',
  database: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5s1.2-6.1 3.8-8.5z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 3h5M12 3v3"/>',
  zap: '<path d="M13 3 5 13.5h6L10 21l8.5-11H12.5z"/>',
  layers: '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>',
  list: '<path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  queue: '<rect x="3" y="8" width="5" height="8" rx="1.5"/><rect x="9.5" y="8" width="5" height="8" rx="1.5"/><rect x="16" y="8" width="5" height="8" rx="1.5"/>',
  cpu: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><path d="M10 10h4v4h-4zM9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>',
  code: '<path d="m8.5 7.5-5 4.5 5 4.5M15.5 7.5l5 4.5-5 4.5M13.5 5l-3 14"/>',
  file: '<path d="M6.5 3.5h7l4 4v13h-11z"/><path d="M13.5 3.5v4h4"/>',
  folder: '<path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/>',
  key: '<circle cx="8" cy="15.5" r="4"/><path d="m11 12.5 8.5-8.5M16 7.5l2.5 2.5M13.5 10l2 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  alert: '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  bulb: '<path d="M8.5 14.5a6 6 0 1 1 7 0c-.7.6-1 1.3-1 2.2V17h-5v-.3c0-.9-.3-1.6-1-2.2z"/><path d="M9.8 20.5h4.4"/>',
  spark: '<path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2z"/>',
  'arrow-right': '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  'arrow-left': '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
  'chevron-right': '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
  'chevron-down': '<path d="m5.5 9 6.5 6.5L18.5 9"/>',
  play: '<path d="M7.5 5v14l11.5-7z"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4 4.5v4.2h4.2"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 5 5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/>',
  moon: '<path d="M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7z"/>',
  menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  book: '<path d="M4 5.5c2.8-1 5.4-.8 8 .8 2.6-1.6 5.2-1.8 8-.8v13c-2.8-1-5.4-.8-8 .8-2.6-1.6-5.2-1.8-8-.8z"/><path d="M12 6.3v13"/>',
  flag: '<path d="M5.5 21V4M5.5 5h11l-2 4 2 4h-11"/>',
  gauge: '<path d="M4 17a8.5 8.5 0 1 1 16 0"/><path d="m12 14.5 4-5.5"/>',
  box: '<path d="m12 3.5 8 4.2v8.6l-8 4.2-8-4.2V7.7z"/><path d="m4 7.7 8 4.3 8-4.3M12 12v8.5"/>',
  cloud: '<path d="M7 18.5a4 4 0 0 1-.6-8 5.8 5.8 0 0 1 11.2 1.3 3.4 3.4 0 0 1-.6 6.7z"/>',
  repeat: '<path d="M4.5 11V9.5a3 3 0 0 1 3-3H19M16 3.5l3 3-3 3M19.5 13v1.5a3 3 0 0 1-3 3H5M8 20.5l-3-3 3-3"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  message: '<path d="M4 5.5h16v11H10.5L6 20v-3.5H4z"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
  window: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9.5h17M7 7.2h.01M10 7.2h.01"/>',
  cursor: '<path d="m6 4 12 6.5-5.3 1.7L11 17.5z"/>',
  hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5c0 4 4.5 5 4.5 8.500s-4.5 4.500-4.500 8.500M16.5 3.5c0 4-4.500 5-4.500 8.500s4.500 4.500 4.500 8.500"/>',
  target: '<circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="4.500"/><path d="M12 12h.01"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  cheatsheet: '<rect x="4" y="4" width="7" height="7" rx="1.500"/><rect x="13" y="4" width="7" height="7" rx="1.500"/><rect x="4" y="13" width="7" height="7" rx="1.500"/><rect x="13" y="13" width="7" height="7" rx="1.500"/>',
  term: '<path d="M5 6.500h14M12 6.500V19M8.500 19h7"/>',
};

export const iconNames = Object.keys(P);

/** HTML 用。currentColor で色が決まる。 */
export function icon(name: string, size = 16): string {
  const body = P[name] ?? P.box;
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** SVG の図の中に置く用。中心を (x, y) に合わせる。 */
export function iconAt(name: string, x: number, y: number, size = 16): string {
  const body = P[name] ?? P.box;
  const s = size / 24;
  return `<g class="g-ico" transform="translate(${x - size / 2} ${y - size / 2}) scale(${s})" fill="none" stroke-width="${2 / Math.max(s, 0.5) * 0.72}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
}
