/* Generates img/og.png (1200x630) — zero dependencies */
const fs = require('fs');
const zlib = require('zlib');
const W = 1200, H = 630;
const px = Buffer.alloc(W * H * 3);

function set(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r; px[i + 1] = g; px[i + 2] = b;
}

/* background gradient */
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = Math.round(11 + t * 4), g = Math.round(15 + t * 8), b = Math.round(23 + t * 16);
  for (let x = 0; x < W; x++) set(x, y, r, g, b);
}

/* lightning bolt */
const pts = [[292, 60], [140, 292], [236, 292], [196, 452], [372, 220], [276, 220]]
  .map(p => [421 + p[0] * 0.7, 40 + p[1] * 0.7]);
function inPoly(x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
for (let y = 30; y < 410; y++) for (let x = 480; x < 700; x++) {
  if (inPoly(x, y)) set(x, y, 34, 211, 238);
}

/* pixel font */
const FONT = {
  R: [30, 17, 17, 30, 20, 18, 17], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  L: [16, 16, 16, 16, 16, 16, 31], X: [17, 10, 4, 4, 4, 10, 17], A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30], T: [31, 4, 4, 4, 4, 4, 4], S: [15, 16, 16, 14, 1, 1, 30],
  Y: [17, 10, 4, 4, 4, 4, 4], O: [14, 17, 17, 17, 17, 17, 14], U: [17, 17, 17, 17, 17, 17, 14]
};
function text(str, x0, y0, s, col) {
  let x = x0;
  for (const ch of str) {
    const g = FONT[ch];
    if (g) for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++)
      if ((g[r] >> (4 - c)) & 1)
        for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++)
          set(x + c * s + dx, y0 + r * s + dy, col[0], col[1], col[2]);
    x += 6 * s;
  }
}
text('REFLEXLAB', 282, 470, 12, [232, 236, 244]);
text('TEST YOUR REFLEXES', 279, 570, 6, [139, 148, 167]);

/* PNG encoder */
let CT;
function crc32(buf) {
  if (!CT) { CT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CT[n] = c >>> 0; } }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CT[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const raw = Buffer.alloc(H * (W * 3 + 1));
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);
fs.mkdirSync('img', { recursive: true });
fs.writeFileSync('img/og.png', png);
console.log('OK: img/og.png (' + png.length + ' bytes)');