import { browser } from '$app/environment';
import { Chart } from 'chart.js';
import { mode } from 'mode-watcher';
import { readable } from 'svelte/store';

/** The theme's colours for charts, as HSL components ("217 91% 60%"): use them as `hsl(${palette.primary})` */
export type ChartPalette = {
	mode: 'light' | 'dark';
	primary: string;
	secondary: string;
	foreground: string;
	mutedForeground: string;
	border: string;
};

function readPalette(): ChartPalette {
	const style = getComputedStyle(document.documentElement);
	const color = (name: string) => style.getPropertyValue(name).trim().split(/\s+/).join(', ');
	return {
		mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
		primary: color('--primary'),
		secondary: color('--secondary'),
		foreground: color('--foreground'),
		mutedForeground: color('--muted-foreground'),
		border: color('--border')
	};
}

/** Grid lines, text and fonts for every chart drawn from now on */
function applyDefaults(palette: ChartPalette) {
	Chart.defaults.backgroundColor = `hsl(${palette.primary})`;
	Chart.defaults.borderColor = `hsl(0, 0%, ${palette.mode === 'light' ? '64%' : '16%'})`;
	Chart.defaults.color = `hsl(${palette.mutedForeground})`;
	Chart.defaults.font.weight = 500;
	Chart.defaults.font.family = "'Inter', sans-serif";
}

/**
 * The chart colours of the theme showing now. Charts read it in their $effect, so they are drawn
 * again when the theme changes (Light, Dark, or System following the phone) instead of keeping the
 * colours they were first drawn with. Null while the page is built on the server
 */
export const chartTheme = readable<ChartPalette | null>(null, (set) => {
	if (!browser) return;
	let shown = '';
	const publish = () => {
		const palette = readPalette();
		applyDefaults(palette);
		// The same colours again (mode-watcher's first value): no redraw
		if (JSON.stringify(palette) === shown) return;
		shown = JSON.stringify(palette);
		set(palette);
	};
	// Before the first chart draws
	publish();
	let frame = 0;
	const unsubscribe = mode.subscribe((current) => {
		if (!current) return;
		cancelAnimationFrame(frame);
		// mode-watcher switches the page's class after it says so: wait for it (a few frames at most)
		let tries = 0;
		const whenSwitched = () => {
			const switched = document.documentElement.classList.contains('dark') === (current === 'dark');
			if (switched || ++tries > 10) publish();
			else frame = requestAnimationFrame(whenSwitched);
		};
		frame = requestAnimationFrame(whenSwitched);
	});
	return () => {
		cancelAnimationFrame(frame);
		unsubscribe();
	};
});
