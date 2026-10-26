import { Prisma } from '@prisma/client';

export const EXPORT_FORMATS = ['json', 'csv'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * Vercel caps a function's response payload at 4.5 MB; stay clearly below that on the wire.
 * The export is served gzip-compressed and this limit applies to the COMPRESSED bytes, so roughly
 * 30-40 MB of raw JSON/CSV still fits; the preflight only stops absurdly large accounts.
 * https://vercel.com/docs/functions/limitations
 */
export const EXPORT_MAX_BYTES = 4_000_000;

/**
 * The preflight estimate is deliberately pessimistic (about 2x the real size), so it must not be compared with
 * EXPORT_MAX_BYTES or it refuses exports that would fit. It only stops absurdly large accounts before their rows
 * are read into memory; the exact byte check after serializing is what enforces EXPORT_MAX_BYTES.
 */
export const EXPORT_PREFLIGHT_MAX_BYTES = 40_000_000;

/** Explicit for Neon cold starts; the timeout must stay below the route's maxDuration (30s) */
export const EXPORT_TX_OPTIONS = {
	isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
	maxWait: 10_000,
	timeout: 20_000
};

/**
 * gzip the serialized export. The route serves the result with Content-Encoding: gzip;
 * browsers and fetch clients decompress transparently, so the download is unchanged.
 */
export async function gzipExportBody(body: string): Promise<Uint8Array> {
	const stream = new Blob([body]).stream().pipeThrough(new CompressionStream('gzip'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

export class ExportTooLargeError extends Error {
	constructor(public readonly estimatedBytes: number) {
		super(`Export is far over the ${EXPORT_MAX_BYTES}-byte download limit (estimated ${estimatedBytes} bytes)`);
	}
}

type Tx = Prisma.TransactionClient;

/** Rough upper bound, checked before reading full rows against EXPORT_PREFLIGHT_MAX_BYTES; the exact byte check after serializing enforces the real limit */
async function estimateExportBytes(tx: Tx, userId: string): Promise<number> {
	const [row] = await tx.$queryRaw<[{ textbytes: bigint; rowcount: bigint }]>(Prisma.sql`
		SELECT COALESCE(SUM(t.text_bytes), 0)::bigint AS textbytes, COALESCE(SUM(t.row_count), 0)::bigint AS rowcount
		FROM (
			SELECT SUM(OCTET_LENGTH(COALESCE(w.note, '')) + OCTET_LENGTH(COALESCE(w."routineName", ''))) AS text_bytes, COUNT(*) AS row_count FROM "Workout" w WHERE w."userId" = ${userId}
			UNION ALL
			SELECT SUM(OCTET_LENGTH(COALESCE(we.name, '')) + OCTET_LENGTH(COALESCE(we.note, '')) + OCTET_LENGTH(COALESCE(we."exerciseNote", '')) + OCTET_LENGTH(COALESCE(we."customMuscleGroup", ''))), COUNT(*) FROM "WorkoutExercise" we JOIN "Workout" w ON w.id = we."workoutId" WHERE w."userId" = ${userId}
			UNION ALL
			SELECT NULL, COUNT(*) FROM "WorkoutExerciseSet" s JOIN "WorkoutExercise" we ON we.id = s."workoutExerciseId" JOIN "Workout" w ON w.id = we."workoutId" WHERE w."userId" = ${userId}
			UNION ALL
			SELECT NULL, COUNT(*) FROM "WorkoutExerciseMiniSet" ms JOIN "WorkoutExerciseSet" s ON s.id = ms."workoutExerciseSetId" JOIN "WorkoutExercise" we ON we.id = s."workoutExerciseId" JOIN "Workout" w ON w.id = we."workoutId" WHERE w."userId" = ${userId}
			UNION ALL
			SELECT SUM(OCTET_LENGTH(COALESCE(e.name, '')) + OCTET_LENGTH(COALESCE(e.note, '')) + OCTET_LENGTH(COALESCE(e."customMuscleGroup", ''))), COUNT(*) FROM "Exercise" e WHERE e."userId" = ${userId}
			UNION ALL
			SELECT SUM(OCTET_LENGTH(COALESCE(es.name, ''))), COUNT(*) FROM "ExerciseSplit" es WHERE es."userId" = ${userId}
			UNION ALL
			SELECT SUM(OCTET_LENGTH(COALESCE(d.name, ''))), COUNT(*) FROM "ExerciseSplitDay" d JOIN "ExerciseSplit" es ON es.id = d."exerciseSplitId" WHERE es."userId" = ${userId}
			UNION ALL
			SELECT SUM(OCTET_LENGTH(COALESCE(t.name, '')) + OCTET_LENGTH(COALESCE(t.note, '')) + OCTET_LENGTH(COALESCE(t."customMuscleGroup", ''))), COUNT(*) FROM "ExerciseTemplate" t JOIN "ExerciseSplitDay" d ON d.id = t."exerciseSplitDayId" JOIN "ExerciseSplit" es ON es.id = d."exerciseSplitId" WHERE es."userId" = ${userId}
			UNION ALL
			SELECT SUM(OCTET_LENGTH(COALESCE(m.name, ''))), COUNT(*) FROM "Mesocycle" m WHERE m."userId" = ${userId}
			UNION ALL
			SELECT SUM(OCTET_LENGTH(COALESCE(c."customMuscleGroup", ''))), COUNT(*) FROM "MesocycleCyclicSetChange" c JOIN "Mesocycle" m ON m.id = c."mesocycleId" WHERE m."userId" = ${userId}
			UNION ALL
			SELECT NULL, COUNT(*) FROM "WorkoutOfMesocycle" wom JOIN "Mesocycle" m ON m.id = wom."mesocycleId" WHERE m."userId" = ${userId}
			UNION ALL
			SELECT SUM(OCTET_LENGTH(COALESCE(ws.name, ''))), COUNT(*) FROM "WeightSet" ws WHERE ws."userId" = ${userId}
			UNION ALL
			SELECT SUM(OCTET_LENGTH(COALESCE(u.name, '')) + OCTET_LENGTH(COALESCE(u.email, ''))), COUNT(*) FROM "User" u WHERE u.id = ${userId}
		) t
	`);
	// text can grow with escaping (JSON quotes, CSV doubling) and each row adds field names and punctuation
	return Number(row.textbytes) * 4 + Number(row.rowcount) * 512 + 4096;
}

export async function fetchExportData(tx: Tx, userId: string) {
	const estimatedBytes = await estimateExportBytes(tx, userId);
	if (estimatedBytes > EXPORT_PREFLIGHT_MAX_BYTES) throw new ExportTooLargeError(estimatedBytes);

	// Sequential: an interactive transaction runs on one connection and rejects concurrent queries
	const profile = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
	const settings = await tx.userSettings.findUnique({ where: { userId } });
	const weightSets = await tx.weightSet.findMany({ where: { userId }, orderBy: { id: 'asc' } });
	const exercises = await tx.exercise.findMany({ where: { userId }, orderBy: { id: 'asc' } });
	const exerciseSplit = await tx.exerciseSplit.findUnique({
		where: { userId },
		include: {
			exerciseSplitDays: {
				orderBy: { dayIndex: 'asc' },
				include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
			}
		}
	});
	const mesocycles = await tx.mesocycle.findMany({
		where: { userId },
		orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
		include: {
			mesocycleCyclicSetChanges: { orderBy: { id: 'asc' } },
			workoutsOfMesocycle: { orderBy: { workoutId: 'asc' } }
		}
	});
	const workouts = await tx.workout.findMany({
		where: { userId },
		orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
		include: {
			workoutExercises: {
				orderBy: { exerciseIndex: 'asc' },
				include: {
					sets: { orderBy: { setIndex: 'asc' }, include: { miniSets: { orderBy: { miniSetIndex: 'asc' } } } }
				}
			}
		}
	});

	return { profile, settings, weightSets, exercises, exerciseSplit, mesocycles, workouts };
}

export type ExportData = Awaited<ReturnType<typeof fetchExportData>>;

export function buildJsonExport(data: ExportData, appVersion: string): string {
	return JSON.stringify({
		formatVersion: 1,
		exportedAt: new Date().toISOString(),
		appVersion,
		profile: data.profile,
		settings: data.settings,
		weightSets: data.weightSets,
		exercises: data.exercises,
		exerciseSplit: data.exerciseSplit,
		mesocycles: data.mesocycles,
		workouts: data.workouts
	});
}

/** setIndex counts from 0 as stored; setNumber is the same position counted from 1 */
const CSV_HEADERS = [
	'workoutId',
	'workoutExerciseId',
	'setId',
	'workoutStartedAt',
	'workoutEndedAt',
	'routineName',
	'mesocycleName',
	'workoutNote',
	'routineNote',
	'exerciseNote',
	'exerciseName',
	'muscleGroup',
	'setType',
	'setIndex',
	'setNumber',
	'reps',
	'loadKg',
	'machineLevel',
	'displayUnit',
	'RIR',
	'skipped',
	'isDeload',
	'weightSetId',
	'bodyweightKg',
	'bodyweightFraction',
	'miniSets'
] as const;

function escapeCell(value: string): string {
	return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * A text cell a spreadsheet could read as a formula gets a leading single quote, including when the
 * formula prefix hides behind whitespace or control characters. Only text cells: negative numbers
 * (assistance loads) stay numeric. JSON keeps the original text.
 */
function textCell(value: string | null | undefined): string {
	if (value == null) return '';
	const guarded = /^[\s\p{Cc}]*[=+\-@]/u.test(value) ? `'${value}` : value;
	return escapeCell(guarded);
}

function numCell(value: number | null | undefined): string {
	return value == null ? '' : String(value);
}

function boolCell(value: boolean): string {
	return value ? 'true' : 'false';
}

export function buildCsvExport(data: ExportData): string {
	const mesocycleNameByWorkoutId = new Map<string, string>();
	for (const mesocycle of data.mesocycles)
		for (const link of mesocycle.workoutsOfMesocycle) mesocycleNameByWorkoutId.set(link.workoutId, mesocycle.name);

	const lines: string[] = [CSV_HEADERS.join(',')];
	for (const workout of data.workouts) {
		for (const exercise of workout.workoutExercises) {
			const isLevels = exercise.weightUnit === 'LEVEL';
			for (const set of exercise.sets) {
				const miniSets =
					set.miniSets.length === 0
						? ''
						: JSON.stringify(
								set.miniSets.map((miniSet) => ({
									reps: miniSet.reps,
									...(isLevels ? { loadLevel: miniSet.load } : { loadKg: miniSet.load }),
									RIR: miniSet.RIR
								}))
							);
				lines.push(
					[
						textCell(workout.id),
						textCell(exercise.id),
						textCell(set.id),
						workout.startedAt.toISOString(),
						workout.endedAt.toISOString(),
						textCell(workout.routineName),
						textCell(mesocycleNameByWorkoutId.get(workout.id)),
						textCell(workout.note),
						textCell(exercise.note),
						textCell(exercise.exerciseNote),
						textCell(exercise.name),
						textCell(exercise.customMuscleGroup ?? exercise.targetMuscleGroup),
						textCell(exercise.setType),
						String(set.setIndex),
						String(set.setIndex + 1),
						String(set.reps),
						isLevels ? '' : numCell(set.load),
						isLevels ? numCell(set.load) : '',
						exercise.weightUnit,
						String(set.RIR),
						boolCell(set.skipped),
						boolCell(workout.isDeload),
						textCell(exercise.weightSetId),
						numCell(workout.userBodyweight),
						numCell(exercise.bodyweightFraction),
						escapeCell(miniSets)
					].join(',')
				);
			}
		}
	}
	// BOM first, so spreadsheet apps read the file as UTF-8
	return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
