/**
 * Draws every app icon in static/ from scripts/icons/logo.svg (and logo-small.svg for 32 px and below),
 * keeping each existing file's name and size. Run: node scripts/icons/generate.mjs (CHROMIUM_PATH=<chrome> to use a given browser)
 */
import { chromium } from '@playwright/test';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const root = process.cwd();
const logo = readFileSync(path.join(root, 'scripts/icons/logo.svg'), 'utf8');
const small = readFileSync(path.join(root, 'scripts/icons/logo-small.svg'), 'utf8');
const BLUE = '#2C74BA';

/** A PNG's width and height, from its header */
function pngSize(file) {
	const buffer = readFileSync(file);
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** The artwork without its rounded tile, for icons the platform shapes itself */
const bare = (svg) => svg.replace(/<rect width="120" height="120" rx="28" fill="#2C74BA"\/>/, '');

/**
 * How each icon is drawn:
 * - tile: the rounded tile filling the image (Android launcher, favicon, header)
 * - square: square background edge to edge (iOS and maskable round the corners themselves);
 *   `inset` shrinks the artwork into the safe zone
 * - centered: the tile in the middle of a transparent image (Windows tiles, splash screens)
 */
function html({ width, height }, style, inset = 1) {
	const size = Math.min(width, height);
	const svg = size <= 32 ? small : logo;
	const body = (() => {
		if (style === 'tile') return svg.replace('<svg ', `<svg width="${width}" height="${height}" `);
		if (style === 'square') {
			const art = size * inset;
			return `<div style="width:${width}px;height:${height}px;background:${BLUE};display:flex;align-items:center;justify-content:center">${bare(svg).replace('<svg ', `<svg width="${art}" height="${art}" `)}</div>`;
		}
		const art = Math.round(size * 0.6);
		return `<div style="width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center">${svg.replace('<svg ', `<svg width="${art}" height="${art}" `)}</div>`;
	})();
	return `<!doctype html><html><body style="margin:0;background:transparent">${body}</body></html>`;
}

const targets = [];
const add = (dir, style, inset) => {
	for (const name of readdirSync(path.join(root, 'static', dir)).filter((n) => n.endsWith('.png'))) {
		targets.push({ file: path.join(root, 'static', dir, name), style, inset });
	}
};
add('android', 'tile');
add('ios', 'square', 0.86);
add('windows11', 'centered');
targets.push({ file: path.join(root, 'static/maskable_icon_x192.png'), style: 'square', inset: 0.72 });
targets.push({ file: path.join(root, 'static/favicon.png'), style: 'tile' });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const { file, style, inset } of targets) {
	const size = pngSize(file);
	await page.setViewportSize(size);
	await page.setContent(html(size, style, inset));
	await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, ...size } });
}

// favicon.ico: one 48 px PNG inside an ICO container
await page.setViewportSize({ width: 48, height: 48 });
await page.setContent(html({ width: 48, height: 48 }, 'tile'));
const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 48, height: 48 } });
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(48, 6);
header.writeUInt8(48, 7);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync(path.join(root, 'static/favicon.ico'), Buffer.concat([header, png]));
writeFileSync(path.join(root, 'static/logo.svg'), logo);
await browser.close();
console.log(`Drew ${targets.length + 2} icons`);
