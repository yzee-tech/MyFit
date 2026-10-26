/**
 * Distances are always stored in metres, like weights in kg. These helpers convert at the edges
 * (what a DistanceTime set shows and takes) and format the times and paces cardio sets log.
 */
import type { DistanceUnit } from './prismaEnums';

export const M_PER_KM = 1000;
export const M_PER_MI = 1609.344;
export const M_PER_FT = 0.3048;

const METERS_PER_UNIT: Record<DistanceUnit, number> = { KM: M_PER_KM, MI: M_PER_MI, M: 1, FT: M_PER_FT };

export const DISTANCE_UNITS: readonly DistanceUnit[] = ['KM', 'MI', 'M', 'FT'];

export function toMeters(value: number, unit: DistanceUnit): number {
	return value * METERS_PER_UNIT[unit];
}

export function fromMeters(meters: number, unit: DistanceUnit): number {
	return meters / METERS_PER_UNIT[unit];
}

/** Rounds away floating point noise from conversions, e.g. 4.9999999 km → 5 */
export function roundDistance(value: number): number {
	return Math.round(value * 1000) / 1000;
}

export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
	if (from === to) return value;
	return roundDistance(fromMeters(toMeters(value, from), to));
}

export function distanceUnitLabel(unit: DistanceUnit): string {
	return { KM: 'km', MI: 'mi', M: 'm', FT: 'ft' }[unit];
}

/** e.g. "5.2 km" for 5200 m */
export function formatDistance(meters: number, unit: DistanceUnit): string {
	return `${roundDistance(fromMeters(meters, unit))} ${distanceUnitLabel(unit)}`;
}

/** The step the distance box moves in: metres and feet are whole, km and miles to 10 m */
export function distanceStep(unit: DistanceUnit): number {
	return unit === 'M' || unit === 'FT' ? 1 : 0.01;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "m:ss", or "h:mm:ss" from an hour, e.g. 90 → "1:30", 3661 → "1:01:01" */
export function formatDuration(seconds: number): string {
	const whole = Math.max(0, Math.round(seconds));
	const h = Math.floor(whole / 3600);
	const m = Math.floor((whole % 3600) / 60);
	const s = whole % 60;
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Seconds from what was typed in a time box: "m:ss", "h:mm:ss", or a bare number of minutes ("30",
 * "12.5"); null for anything else, a non-positive time, or more than a day
 */
export function parseDuration(text: string): number | null {
	const trimmed = text.trim();
	if (trimmed === '') return null;
	const inBounds = (seconds: number) => (isValidTimeSeconds(seconds) ? seconds : null);
	if (/^\d+(\.\d+)?$/.test(trimmed)) return inBounds(Math.round(Number(trimmed) * 60));
	const match = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/.exec(trimmed);
	if (!match) return null;
	const [, h, m, s] = match;
	if (Number(s) >= 60 || (h !== undefined && Number(m) >= 60)) return null;
	return inBounds((h ? Number(h) * 3600 : 0) + Number(m) * 60 + Number(s));
}

/**
 * How pace is quoted per unit: minutes per km or mile; rowing's per 500 m; per 100 ft. The denominator
 * in metres, and its label
 */
export function paceDenominator(unit: DistanceUnit): { meters: number; label: string } {
	switch (unit) {
		case 'KM':
			return { meters: M_PER_KM, label: '/km' };
		case 'MI':
			return { meters: M_PER_MI, label: '/mi' };
		case 'M':
			return { meters: 500, label: '/500m' };
		case 'FT':
			return { meters: 100 * M_PER_FT, label: '/100ft' };
	}
}

/**
 * e.g. "5:12 /km"; null while there's no distance or time yet, so there's never a divide by zero or a
 * "NaN /km" to show
 */
export function formatPace(seconds: number | null | undefined, meters: number | null | undefined, unit: DistanceUnit) {
	if (!seconds || !meters || seconds <= 0 || meters <= 0) return null;
	const { meters: per, label } = paceDenominator(unit);
	return `${formatDuration((seconds / meters) * per)} ${label}`;
}

/** Seconds per pace denominator, for charts; null without a positive distance and time */
export function paceSeconds(seconds: number, meters: number, unit: DistanceUnit): number | null {
	if (seconds <= 0 || meters <= 0) return null;
	return (seconds / meters) * paceDenominator(unit).meters;
}

export const MAX_TIME_SECONDS = 86_400;
export const MAX_DISTANCE_METERS = 1_000_000;

export function isValidTimeSeconds(seconds: unknown): seconds is number {
	return typeof seconds === 'number' && Number.isInteger(seconds) && seconds >= 1 && seconds <= MAX_TIME_SECONDS;
}

export function isValidDistanceMeters(meters: unknown): meters is number {
	return typeof meters === 'number' && Number.isFinite(meters) && meters > 0 && meters <= MAX_DISTANCE_METERS;
}
