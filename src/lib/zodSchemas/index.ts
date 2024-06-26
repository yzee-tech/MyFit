import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['Serializable']);

export const ExerciseSplitScalarFieldEnumSchema = z.enum(['id','name','userId']);

export const ExerciseSplitDayScalarFieldEnumSchema = z.enum(['id','name','dayIndex','isRestDay','exerciseSplitId']);

export const ExerciseTemplateScalarFieldEnumSchema = z.enum(['id','name','exerciseIndex','targetMuscleGroup','customMuscleGroup','involvesBodyweight','setType','repRangeStart','repRangeEnd','changeType','changeAmount','note','exerciseSplitDayId']);

export const MesocycleScalarFieldEnumSchema = z.enum(['id','name','userId','exerciseSplitId','RIRProgression','startDate','endDate','preferredProgressionVariable','startOverloadPercentage','lastSetToFailure','forceRIRMatching']);

export const MesocycleCyclicSetChangeScalarFieldEnumSchema = z.enum(['id','mesocycleId','muscleGroup','customMuscleGroup','regardlessOfProgress','setIncreaseAmount','maxVolume']);

export const MesocycleExerciseSplitDayScalarFieldEnumSchema = z.enum(['id','name','dayIndex','isRestDay','mesocycleId']);

export const MesocycleExerciseTemplateScalarFieldEnumSchema = z.enum(['id','name','exerciseIndex','targetMuscleGroup','customMuscleGroup','involvesBodyweight','sets','setType','repRangeStart','repRangeEnd','changeType','changeAmount','note','mesocycleExerciseSplitDayId','preferredProgressionVariable','overloadPercentage','lastSetToFailure','forceRIRMatching']);

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','createdAt','updatedAt']);

export const AccountScalarFieldEnumSchema = z.enum(['userId','type','provider','providerAccountId','refresh_token','access_token','expires_at','token_type','scope','id_token','session_state','createdAt','updatedAt']);

export const SessionScalarFieldEnumSchema = z.enum(['sessionToken','userId','expires','createdAt','updatedAt']);

export const VerificationTokenScalarFieldEnumSchema = z.enum(['identifier','token','expires']);

export const WorkoutOfMesocycleScalarFieldEnumSchema = z.enum(['id','workoutId','mesocycleId','splitDayName','workoutStatus']);

export const WorkoutScalarFieldEnumSchema = z.enum(['id','name','createdAt','userId']);

export const WorkoutExerciseScalarFieldEnumSchema = z.enum(['id','exerciseIndex','workoutId','targetMuscleGroup','customMuscleGroup','involvesBodyweight','note','preferredProgressionVariable','overloadPercentage','lastSetToFailure','forceRIRMatching','minimumWeightChange','setsOfWorkoutExerciseId']);

export const SetsOfWorkoutExerciseScalarFieldEnumSchema = z.enum(['id','setType','repRangeStart','repRangeEnd']);

export const StraightSetsScalarFieldEnumSchema = z.enum(['id','load','repNumbers','RIRNumbers','setsOfWorkoutExerciseId']);

export const FixedChangeSetsScalarFieldEnumSchema = z.enum(['id','loadNumbers','repNumbers','RIRNumbers','changeType','changeAmount','setsOfWorkoutExerciseId']);

export const VariableChangeSetsScalarFieldEnumSchema = z.enum(['id','loadNumbers','repNumbers','RIRNumbers','setsOfWorkoutExerciseId']);

export const MyorepMatchSetsScalarFieldEnumSchema = z.enum(['id','setsOfWorkoutExerciseId']);

export const MyorepMatchSetScalarFieldEnumSchema = z.enum(['id','repNumber','loadNumber','myoreps','myorepMatchSetsId']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const MuscleGroupSchema = z.enum(['Chest','FrontDelts','SideDelts','RearDelts','Lats','Traps','Triceps','Biceps','Forearms','Quads','Hamstrings','Glutes','Calves','Abs','Neck','Adductors','Abductors','Custom']);

export type MuscleGroupType = `${z.infer<typeof MuscleGroupSchema>}`

export const SetTypeSchema = z.enum(['Straight','V2','Drop','Down','Top','Myorep','MyorepMatch']);

export type SetTypeType = `${z.infer<typeof SetTypeSchema>}`

export const ChangeTypeSchema = z.enum(['Percentage','AbsoluteLoad']);

export type ChangeTypeType = `${z.infer<typeof ChangeTypeSchema>}`

export const ProgressionVariableSchema = z.enum(['Reps','Load']);

export type ProgressionVariableType = `${z.infer<typeof ProgressionVariableSchema>}`

export const WorkoutStatusSchema = z.enum(['Skipped','RestDay']);

export type WorkoutStatusType = `${z.infer<typeof WorkoutStatusSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// EXERCISE SPLIT SCHEMA
/////////////////////////////////////////

export const ExerciseSplitSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  userId: z.string(),
})

export type ExerciseSplit = z.infer<typeof ExerciseSplitSchema>

/////////////////////////////////////////
// EXERCISE SPLIT DAY SCHEMA
/////////////////////////////////////////

export const ExerciseSplitDaySchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  exerciseSplitId: z.string(),
})

export type ExerciseSplitDay = z.infer<typeof ExerciseSplitDaySchema>

/////////////////////////////////////////
// EXERCISE TEMPLATE SCHEMA
/////////////////////////////////////////

export const ExerciseTemplateSchema = z.object({
  targetMuscleGroup: MuscleGroupSchema,
  setType: SetTypeSchema,
  changeType: ChangeTypeSchema.nullable(),
  id: z.string().cuid(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  customMuscleGroup: z.string().nullable(),
  involvesBodyweight: z.boolean(),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeAmount: z.number().nullable(),
  note: z.string().nullable(),
  exerciseSplitDayId: z.string(),
})

export type ExerciseTemplate = z.infer<typeof ExerciseTemplateSchema>

/////////////////////////////////////////
// MESOCYCLE SCHEMA
/////////////////////////////////////////

export const MesocycleSchema = z.object({
  preferredProgressionVariable: ProgressionVariableSchema,
  id: z.string().cuid(),
  name: z.string(),
  userId: z.string(),
  exerciseSplitId: z.string().nullable(),
  RIRProgression: z.number().int().array(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
})

export type Mesocycle = z.infer<typeof MesocycleSchema>

/////////////////////////////////////////
// MESOCYCLE CYCLIC SET CHANGE SCHEMA
/////////////////////////////////////////

export const MesocycleCyclicSetChangeSchema = z.object({
  muscleGroup: MuscleGroupSchema,
  id: z.string().cuid(),
  mesocycleId: z.string(),
  customMuscleGroup: z.string().nullable(),
  regardlessOfProgress: z.boolean(),
  setIncreaseAmount: z.number().int(),
  maxVolume: z.number().int(),
})

export type MesocycleCyclicSetChange = z.infer<typeof MesocycleCyclicSetChangeSchema>

/////////////////////////////////////////
// MESOCYCLE EXERCISE SPLIT DAY SCHEMA
/////////////////////////////////////////

export const MesocycleExerciseSplitDaySchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  mesocycleId: z.string(),
})

export type MesocycleExerciseSplitDay = z.infer<typeof MesocycleExerciseSplitDaySchema>

/////////////////////////////////////////
// MESOCYCLE EXERCISE TEMPLATE SCHEMA
/////////////////////////////////////////

export const MesocycleExerciseTemplateSchema = z.object({
  targetMuscleGroup: MuscleGroupSchema,
  setType: SetTypeSchema,
  changeType: ChangeTypeSchema.nullable(),
  preferredProgressionVariable: ProgressionVariableSchema.nullable(),
  id: z.string().cuid(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  customMuscleGroup: z.string().nullable(),
  involvesBodyweight: z.boolean(),
  sets: z.number().int(),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeAmount: z.number().nullable(),
  note: z.string().nullable(),
  mesocycleExerciseSplitDayId: z.string(),
  overloadPercentage: z.number().nullable(),
  lastSetToFailure: z.boolean().nullable(),
  forceRIRMatching: z.boolean().nullable(),
})

export type MesocycleExerciseTemplate = z.infer<typeof MesocycleExerciseTemplateSchema>

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().nullable(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

export const AccountSchema = z.object({
  userId: z.string(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().nullable(),
  access_token: z.string().nullable(),
  expires_at: z.number().int().nullable(),
  token_type: z.string().nullable(),
  scope: z.string().nullable(),
  id_token: z.string().nullable(),
  session_state: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Account = z.infer<typeof AccountSchema>

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  sessionToken: z.string(),
  userId: z.string(),
  expires: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Session = z.infer<typeof SessionSchema>

/////////////////////////////////////////
// VERIFICATION TOKEN SCHEMA
/////////////////////////////////////////

export const VerificationTokenSchema = z.object({
  identifier: z.string(),
  token: z.string(),
  expires: z.coerce.date(),
})

export type VerificationToken = z.infer<typeof VerificationTokenSchema>

/////////////////////////////////////////
// WORKOUT OF MESOCYCLE SCHEMA
/////////////////////////////////////////

export const WorkoutOfMesocycleSchema = z.object({
  workoutStatus: WorkoutStatusSchema.nullable(),
  id: z.string().cuid(),
  workoutId: z.string(),
  mesocycleId: z.string(),
  splitDayName: z.string(),
})

export type WorkoutOfMesocycle = z.infer<typeof WorkoutOfMesocycleSchema>

/////////////////////////////////////////
// WORKOUT SCHEMA
/////////////////////////////////////////

export const WorkoutSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  createdAt: z.coerce.date(),
  userId: z.string(),
})

export type Workout = z.infer<typeof WorkoutSchema>

/////////////////////////////////////////
// WORKOUT EXERCISE SCHEMA
/////////////////////////////////////////

export const WorkoutExerciseSchema = z.object({
  targetMuscleGroup: MuscleGroupSchema,
  preferredProgressionVariable: ProgressionVariableSchema.nullable(),
  id: z.string().cuid(),
  exerciseIndex: z.number().int(),
  workoutId: z.string(),
  customMuscleGroup: z.string().nullable(),
  involvesBodyweight: z.boolean(),
  note: z.string().nullable(),
  overloadPercentage: z.number().nullable(),
  lastSetToFailure: z.boolean().nullable(),
  forceRIRMatching: z.boolean().nullable(),
  minimumWeightChange: z.number().nullable(),
  setsOfWorkoutExerciseId: z.string(),
})

export type WorkoutExercise = z.infer<typeof WorkoutExerciseSchema>

/////////////////////////////////////////
// SETS OF WORKOUT EXERCISE SCHEMA
/////////////////////////////////////////

export const SetsOfWorkoutExerciseSchema = z.object({
  setType: SetTypeSchema,
  id: z.string().cuid(),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
})

export type SetsOfWorkoutExercise = z.infer<typeof SetsOfWorkoutExerciseSchema>

/////////////////////////////////////////
// STRAIGHT SETS SCHEMA
/////////////////////////////////////////

export const StraightSetsSchema = z.object({
  id: z.string().cuid(),
  load: z.number().int(),
  repNumbers: z.number().int().array(),
  RIRNumbers: z.number().int().array(),
  setsOfWorkoutExerciseId: z.string(),
})

export type StraightSets = z.infer<typeof StraightSetsSchema>

/////////////////////////////////////////
// FIXED CHANGE SETS SCHEMA
/////////////////////////////////////////

export const FixedChangeSetsSchema = z.object({
  changeType: ChangeTypeSchema,
  id: z.string().cuid(),
  loadNumbers: z.number().int().array(),
  repNumbers: z.number().int().array(),
  RIRNumbers: z.number().int().array(),
  changeAmount: z.number(),
  setsOfWorkoutExerciseId: z.string(),
})

export type FixedChangeSets = z.infer<typeof FixedChangeSetsSchema>

/////////////////////////////////////////
// VARIABLE CHANGE SETS SCHEMA
/////////////////////////////////////////

export const VariableChangeSetsSchema = z.object({
  id: z.string().cuid(),
  loadNumbers: z.number().int().array(),
  repNumbers: z.number().int().array(),
  RIRNumbers: z.number().int().array(),
  setsOfWorkoutExerciseId: z.string(),
})

export type VariableChangeSets = z.infer<typeof VariableChangeSetsSchema>

/////////////////////////////////////////
// MYOREP MATCH SETS SCHEMA
/////////////////////////////////////////

export const MyorepMatchSetsSchema = z.object({
  id: z.string().cuid(),
  setsOfWorkoutExerciseId: z.string(),
})

export type MyorepMatchSets = z.infer<typeof MyorepMatchSetsSchema>

/////////////////////////////////////////
// MYOREP MATCH SET SCHEMA
/////////////////////////////////////////

export const MyorepMatchSetSchema = z.object({
  id: z.string().cuid(),
  repNumber: z.number().int(),
  loadNumber: z.number().int(),
  myoreps: z.number().int().array(),
  myorepMatchSetsId: z.string().nullable(),
})

export type MyorepMatchSet = z.infer<typeof MyorepMatchSetSchema>

/////////////////////////////////////////
// SELECT & INCLUDE
/////////////////////////////////////////

// EXERCISE SPLIT
//------------------------------------------------------

export const ExerciseSplitIncludeSchema: z.ZodType<Prisma.ExerciseSplitInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  exerciseSplitDays: z.union([z.boolean(),z.lazy(() => ExerciseSplitDayFindManyArgsSchema)]).optional(),
  usedByMesocycles: z.union([z.boolean(),z.lazy(() => MesocycleFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ExerciseSplitCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const ExerciseSplitArgsSchema: z.ZodType<Prisma.ExerciseSplitDefaultArgs> = z.object({
  select: z.lazy(() => ExerciseSplitSelectSchema).optional(),
  include: z.lazy(() => ExerciseSplitIncludeSchema).optional(),
}).strict();

export const ExerciseSplitCountOutputTypeArgsSchema: z.ZodType<Prisma.ExerciseSplitCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => ExerciseSplitCountOutputTypeSelectSchema).nullish(),
}).strict();

export const ExerciseSplitCountOutputTypeSelectSchema: z.ZodType<Prisma.ExerciseSplitCountOutputTypeSelect> = z.object({
  exerciseSplitDays: z.boolean().optional(),
  usedByMesocycles: z.boolean().optional(),
}).strict();

export const ExerciseSplitSelectSchema: z.ZodType<Prisma.ExerciseSplitSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  userId: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  exerciseSplitDays: z.union([z.boolean(),z.lazy(() => ExerciseSplitDayFindManyArgsSchema)]).optional(),
  usedByMesocycles: z.union([z.boolean(),z.lazy(() => MesocycleFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ExerciseSplitCountOutputTypeArgsSchema)]).optional(),
}).strict()

// EXERCISE SPLIT DAY
//------------------------------------------------------

export const ExerciseSplitDayIncludeSchema: z.ZodType<Prisma.ExerciseSplitDayInclude> = z.object({
  exercises: z.union([z.boolean(),z.lazy(() => ExerciseTemplateFindManyArgsSchema)]).optional(),
  exerciseSplit: z.union([z.boolean(),z.lazy(() => ExerciseSplitArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ExerciseSplitDayCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const ExerciseSplitDayArgsSchema: z.ZodType<Prisma.ExerciseSplitDayDefaultArgs> = z.object({
  select: z.lazy(() => ExerciseSplitDaySelectSchema).optional(),
  include: z.lazy(() => ExerciseSplitDayIncludeSchema).optional(),
}).strict();

export const ExerciseSplitDayCountOutputTypeArgsSchema: z.ZodType<Prisma.ExerciseSplitDayCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => ExerciseSplitDayCountOutputTypeSelectSchema).nullish(),
}).strict();

export const ExerciseSplitDayCountOutputTypeSelectSchema: z.ZodType<Prisma.ExerciseSplitDayCountOutputTypeSelect> = z.object({
  exercises: z.boolean().optional(),
}).strict();

export const ExerciseSplitDaySelectSchema: z.ZodType<Prisma.ExerciseSplitDaySelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  dayIndex: z.boolean().optional(),
  isRestDay: z.boolean().optional(),
  exerciseSplitId: z.boolean().optional(),
  exercises: z.union([z.boolean(),z.lazy(() => ExerciseTemplateFindManyArgsSchema)]).optional(),
  exerciseSplit: z.union([z.boolean(),z.lazy(() => ExerciseSplitArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ExerciseSplitDayCountOutputTypeArgsSchema)]).optional(),
}).strict()

// EXERCISE TEMPLATE
//------------------------------------------------------

export const ExerciseTemplateIncludeSchema: z.ZodType<Prisma.ExerciseTemplateInclude> = z.object({
  exerciseSplitDay: z.union([z.boolean(),z.lazy(() => ExerciseSplitDayArgsSchema)]).optional(),
}).strict()

export const ExerciseTemplateArgsSchema: z.ZodType<Prisma.ExerciseTemplateDefaultArgs> = z.object({
  select: z.lazy(() => ExerciseTemplateSelectSchema).optional(),
  include: z.lazy(() => ExerciseTemplateIncludeSchema).optional(),
}).strict();

export const ExerciseTemplateSelectSchema: z.ZodType<Prisma.ExerciseTemplateSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  exerciseIndex: z.boolean().optional(),
  targetMuscleGroup: z.boolean().optional(),
  customMuscleGroup: z.boolean().optional(),
  involvesBodyweight: z.boolean().optional(),
  setType: z.boolean().optional(),
  repRangeStart: z.boolean().optional(),
  repRangeEnd: z.boolean().optional(),
  changeType: z.boolean().optional(),
  changeAmount: z.boolean().optional(),
  note: z.boolean().optional(),
  exerciseSplitDayId: z.boolean().optional(),
  exerciseSplitDay: z.union([z.boolean(),z.lazy(() => ExerciseSplitDayArgsSchema)]).optional(),
}).strict()

// MESOCYCLE
//------------------------------------------------------

export const MesocycleIncludeSchema: z.ZodType<Prisma.MesocycleInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  exerciseSplit: z.union([z.boolean(),z.lazy(() => ExerciseSplitArgsSchema)]).optional(),
  mesocycleExerciseSplitDays: z.union([z.boolean(),z.lazy(() => MesocycleExerciseSplitDayFindManyArgsSchema)]).optional(),
  mesocycleCyclicSetChanges: z.union([z.boolean(),z.lazy(() => MesocycleCyclicSetChangeFindManyArgsSchema)]).optional(),
  workoutsOfMesocycle: z.union([z.boolean(),z.lazy(() => WorkoutOfMesocycleFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => MesocycleCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const MesocycleArgsSchema: z.ZodType<Prisma.MesocycleDefaultArgs> = z.object({
  select: z.lazy(() => MesocycleSelectSchema).optional(),
  include: z.lazy(() => MesocycleIncludeSchema).optional(),
}).strict();

export const MesocycleCountOutputTypeArgsSchema: z.ZodType<Prisma.MesocycleCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => MesocycleCountOutputTypeSelectSchema).nullish(),
}).strict();

export const MesocycleCountOutputTypeSelectSchema: z.ZodType<Prisma.MesocycleCountOutputTypeSelect> = z.object({
  mesocycleExerciseSplitDays: z.boolean().optional(),
  mesocycleCyclicSetChanges: z.boolean().optional(),
  workoutsOfMesocycle: z.boolean().optional(),
}).strict();

export const MesocycleSelectSchema: z.ZodType<Prisma.MesocycleSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  userId: z.boolean().optional(),
  exerciseSplitId: z.boolean().optional(),
  RIRProgression: z.boolean().optional(),
  startDate: z.boolean().optional(),
  endDate: z.boolean().optional(),
  preferredProgressionVariable: z.boolean().optional(),
  startOverloadPercentage: z.boolean().optional(),
  lastSetToFailure: z.boolean().optional(),
  forceRIRMatching: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  exerciseSplit: z.union([z.boolean(),z.lazy(() => ExerciseSplitArgsSchema)]).optional(),
  mesocycleExerciseSplitDays: z.union([z.boolean(),z.lazy(() => MesocycleExerciseSplitDayFindManyArgsSchema)]).optional(),
  mesocycleCyclicSetChanges: z.union([z.boolean(),z.lazy(() => MesocycleCyclicSetChangeFindManyArgsSchema)]).optional(),
  workoutsOfMesocycle: z.union([z.boolean(),z.lazy(() => WorkoutOfMesocycleFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => MesocycleCountOutputTypeArgsSchema)]).optional(),
}).strict()

// MESOCYCLE CYCLIC SET CHANGE
//------------------------------------------------------

export const MesocycleCyclicSetChangeIncludeSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeInclude> = z.object({
  mesocycle: z.union([z.boolean(),z.lazy(() => MesocycleArgsSchema)]).optional(),
}).strict()

export const MesocycleCyclicSetChangeArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeDefaultArgs> = z.object({
  select: z.lazy(() => MesocycleCyclicSetChangeSelectSchema).optional(),
  include: z.lazy(() => MesocycleCyclicSetChangeIncludeSchema).optional(),
}).strict();

export const MesocycleCyclicSetChangeSelectSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeSelect> = z.object({
  id: z.boolean().optional(),
  mesocycleId: z.boolean().optional(),
  muscleGroup: z.boolean().optional(),
  customMuscleGroup: z.boolean().optional(),
  regardlessOfProgress: z.boolean().optional(),
  setIncreaseAmount: z.boolean().optional(),
  maxVolume: z.boolean().optional(),
  mesocycle: z.union([z.boolean(),z.lazy(() => MesocycleArgsSchema)]).optional(),
}).strict()

// MESOCYCLE EXERCISE SPLIT DAY
//------------------------------------------------------

export const MesocycleExerciseSplitDayIncludeSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayInclude> = z.object({
  mesocycle: z.union([z.boolean(),z.lazy(() => MesocycleArgsSchema)]).optional(),
  mesocycleSplitDayExercises: z.union([z.boolean(),z.lazy(() => MesocycleExerciseTemplateFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => MesocycleExerciseSplitDayCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const MesocycleExerciseSplitDayArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayDefaultArgs> = z.object({
  select: z.lazy(() => MesocycleExerciseSplitDaySelectSchema).optional(),
  include: z.lazy(() => MesocycleExerciseSplitDayIncludeSchema).optional(),
}).strict();

export const MesocycleExerciseSplitDayCountOutputTypeArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => MesocycleExerciseSplitDayCountOutputTypeSelectSchema).nullish(),
}).strict();

export const MesocycleExerciseSplitDayCountOutputTypeSelectSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCountOutputTypeSelect> = z.object({
  mesocycleSplitDayExercises: z.boolean().optional(),
}).strict();

export const MesocycleExerciseSplitDaySelectSchema: z.ZodType<Prisma.MesocycleExerciseSplitDaySelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  dayIndex: z.boolean().optional(),
  isRestDay: z.boolean().optional(),
  mesocycleId: z.boolean().optional(),
  mesocycle: z.union([z.boolean(),z.lazy(() => MesocycleArgsSchema)]).optional(),
  mesocycleSplitDayExercises: z.union([z.boolean(),z.lazy(() => MesocycleExerciseTemplateFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => MesocycleExerciseSplitDayCountOutputTypeArgsSchema)]).optional(),
}).strict()

// MESOCYCLE EXERCISE TEMPLATE
//------------------------------------------------------

export const MesocycleExerciseTemplateIncludeSchema: z.ZodType<Prisma.MesocycleExerciseTemplateInclude> = z.object({
  mesocycleExerciseSplitDay: z.union([z.boolean(),z.lazy(() => MesocycleExerciseSplitDayArgsSchema)]).optional(),
}).strict()

export const MesocycleExerciseTemplateArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateDefaultArgs> = z.object({
  select: z.lazy(() => MesocycleExerciseTemplateSelectSchema).optional(),
  include: z.lazy(() => MesocycleExerciseTemplateIncludeSchema).optional(),
}).strict();

export const MesocycleExerciseTemplateSelectSchema: z.ZodType<Prisma.MesocycleExerciseTemplateSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  exerciseIndex: z.boolean().optional(),
  targetMuscleGroup: z.boolean().optional(),
  customMuscleGroup: z.boolean().optional(),
  involvesBodyweight: z.boolean().optional(),
  sets: z.boolean().optional(),
  setType: z.boolean().optional(),
  repRangeStart: z.boolean().optional(),
  repRangeEnd: z.boolean().optional(),
  changeType: z.boolean().optional(),
  changeAmount: z.boolean().optional(),
  note: z.boolean().optional(),
  mesocycleExerciseSplitDayId: z.boolean().optional(),
  preferredProgressionVariable: z.boolean().optional(),
  overloadPercentage: z.boolean().optional(),
  lastSetToFailure: z.boolean().optional(),
  forceRIRMatching: z.boolean().optional(),
  mesocycleExerciseSplitDay: z.union([z.boolean(),z.lazy(() => MesocycleExerciseSplitDayArgsSchema)]).optional(),
}).strict()

// USER
//------------------------------------------------------

export const UserIncludeSchema: z.ZodType<Prisma.UserInclude> = z.object({
  accounts: z.union([z.boolean(),z.lazy(() => AccountFindManyArgsSchema)]).optional(),
  sessions: z.union([z.boolean(),z.lazy(() => SessionFindManyArgsSchema)]).optional(),
  exerciseSplits: z.union([z.boolean(),z.lazy(() => ExerciseSplitFindManyArgsSchema)]).optional(),
  Mesocycle: z.union([z.boolean(),z.lazy(() => MesocycleFindManyArgsSchema)]).optional(),
  Workout: z.union([z.boolean(),z.lazy(() => WorkoutFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const UserArgsSchema: z.ZodType<Prisma.UserDefaultArgs> = z.object({
  select: z.lazy(() => UserSelectSchema).optional(),
  include: z.lazy(() => UserIncludeSchema).optional(),
}).strict();

export const UserCountOutputTypeArgsSchema: z.ZodType<Prisma.UserCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => UserCountOutputTypeSelectSchema).nullish(),
}).strict();

export const UserCountOutputTypeSelectSchema: z.ZodType<Prisma.UserCountOutputTypeSelect> = z.object({
  accounts: z.boolean().optional(),
  sessions: z.boolean().optional(),
  exerciseSplits: z.boolean().optional(),
  Mesocycle: z.boolean().optional(),
  Workout: z.boolean().optional(),
}).strict();

export const UserSelectSchema: z.ZodType<Prisma.UserSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  email: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  image: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  accounts: z.union([z.boolean(),z.lazy(() => AccountFindManyArgsSchema)]).optional(),
  sessions: z.union([z.boolean(),z.lazy(() => SessionFindManyArgsSchema)]).optional(),
  exerciseSplits: z.union([z.boolean(),z.lazy(() => ExerciseSplitFindManyArgsSchema)]).optional(),
  Mesocycle: z.union([z.boolean(),z.lazy(() => MesocycleFindManyArgsSchema)]).optional(),
  Workout: z.union([z.boolean(),z.lazy(() => WorkoutFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
}).strict()

// ACCOUNT
//------------------------------------------------------

export const AccountIncludeSchema: z.ZodType<Prisma.AccountInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

export const AccountArgsSchema: z.ZodType<Prisma.AccountDefaultArgs> = z.object({
  select: z.lazy(() => AccountSelectSchema).optional(),
  include: z.lazy(() => AccountIncludeSchema).optional(),
}).strict();

export const AccountSelectSchema: z.ZodType<Prisma.AccountSelect> = z.object({
  userId: z.boolean().optional(),
  type: z.boolean().optional(),
  provider: z.boolean().optional(),
  providerAccountId: z.boolean().optional(),
  refresh_token: z.boolean().optional(),
  access_token: z.boolean().optional(),
  expires_at: z.boolean().optional(),
  token_type: z.boolean().optional(),
  scope: z.boolean().optional(),
  id_token: z.boolean().optional(),
  session_state: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// SESSION
//------------------------------------------------------

export const SessionIncludeSchema: z.ZodType<Prisma.SessionInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

export const SessionArgsSchema: z.ZodType<Prisma.SessionDefaultArgs> = z.object({
  select: z.lazy(() => SessionSelectSchema).optional(),
  include: z.lazy(() => SessionIncludeSchema).optional(),
}).strict();

export const SessionSelectSchema: z.ZodType<Prisma.SessionSelect> = z.object({
  sessionToken: z.boolean().optional(),
  userId: z.boolean().optional(),
  expires: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// VERIFICATION TOKEN
//------------------------------------------------------

export const VerificationTokenSelectSchema: z.ZodType<Prisma.VerificationTokenSelect> = z.object({
  identifier: z.boolean().optional(),
  token: z.boolean().optional(),
  expires: z.boolean().optional(),
}).strict()

// WORKOUT OF MESOCYCLE
//------------------------------------------------------

export const WorkoutOfMesocycleIncludeSchema: z.ZodType<Prisma.WorkoutOfMesocycleInclude> = z.object({
  workout: z.union([z.boolean(),z.lazy(() => WorkoutArgsSchema)]).optional(),
  mesocycle: z.union([z.boolean(),z.lazy(() => MesocycleArgsSchema)]).optional(),
}).strict()

export const WorkoutOfMesocycleArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleDefaultArgs> = z.object({
  select: z.lazy(() => WorkoutOfMesocycleSelectSchema).optional(),
  include: z.lazy(() => WorkoutOfMesocycleIncludeSchema).optional(),
}).strict();

export const WorkoutOfMesocycleSelectSchema: z.ZodType<Prisma.WorkoutOfMesocycleSelect> = z.object({
  id: z.boolean().optional(),
  workoutId: z.boolean().optional(),
  mesocycleId: z.boolean().optional(),
  splitDayName: z.boolean().optional(),
  workoutStatus: z.boolean().optional(),
  workout: z.union([z.boolean(),z.lazy(() => WorkoutArgsSchema)]).optional(),
  mesocycle: z.union([z.boolean(),z.lazy(() => MesocycleArgsSchema)]).optional(),
}).strict()

// WORKOUT
//------------------------------------------------------

export const WorkoutIncludeSchema: z.ZodType<Prisma.WorkoutInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  workoutOfMesocycle: z.union([z.boolean(),z.lazy(() => WorkoutOfMesocycleArgsSchema)]).optional(),
  workoutExercises: z.union([z.boolean(),z.lazy(() => WorkoutExerciseFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => WorkoutCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const WorkoutArgsSchema: z.ZodType<Prisma.WorkoutDefaultArgs> = z.object({
  select: z.lazy(() => WorkoutSelectSchema).optional(),
  include: z.lazy(() => WorkoutIncludeSchema).optional(),
}).strict();

export const WorkoutCountOutputTypeArgsSchema: z.ZodType<Prisma.WorkoutCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => WorkoutCountOutputTypeSelectSchema).nullish(),
}).strict();

export const WorkoutCountOutputTypeSelectSchema: z.ZodType<Prisma.WorkoutCountOutputTypeSelect> = z.object({
  workoutExercises: z.boolean().optional(),
}).strict();

export const WorkoutSelectSchema: z.ZodType<Prisma.WorkoutSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  userId: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  workoutOfMesocycle: z.union([z.boolean(),z.lazy(() => WorkoutOfMesocycleArgsSchema)]).optional(),
  workoutExercises: z.union([z.boolean(),z.lazy(() => WorkoutExerciseFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => WorkoutCountOutputTypeArgsSchema)]).optional(),
}).strict()

// WORKOUT EXERCISE
//------------------------------------------------------

export const WorkoutExerciseIncludeSchema: z.ZodType<Prisma.WorkoutExerciseInclude> = z.object({
  workout: z.union([z.boolean(),z.lazy(() => WorkoutArgsSchema)]).optional(),
  setData: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
}).strict()

export const WorkoutExerciseArgsSchema: z.ZodType<Prisma.WorkoutExerciseDefaultArgs> = z.object({
  select: z.lazy(() => WorkoutExerciseSelectSchema).optional(),
  include: z.lazy(() => WorkoutExerciseIncludeSchema).optional(),
}).strict();

export const WorkoutExerciseSelectSchema: z.ZodType<Prisma.WorkoutExerciseSelect> = z.object({
  id: z.boolean().optional(),
  exerciseIndex: z.boolean().optional(),
  workoutId: z.boolean().optional(),
  targetMuscleGroup: z.boolean().optional(),
  customMuscleGroup: z.boolean().optional(),
  involvesBodyweight: z.boolean().optional(),
  note: z.boolean().optional(),
  preferredProgressionVariable: z.boolean().optional(),
  overloadPercentage: z.boolean().optional(),
  lastSetToFailure: z.boolean().optional(),
  forceRIRMatching: z.boolean().optional(),
  minimumWeightChange: z.boolean().optional(),
  setsOfWorkoutExerciseId: z.boolean().optional(),
  workout: z.union([z.boolean(),z.lazy(() => WorkoutArgsSchema)]).optional(),
  setData: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
}).strict()

// SETS OF WORKOUT EXERCISE
//------------------------------------------------------

export const SetsOfWorkoutExerciseIncludeSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseInclude> = z.object({
  workoutExercise: z.union([z.boolean(),z.lazy(() => WorkoutExerciseArgsSchema)]).optional(),
  straightSets: z.union([z.boolean(),z.lazy(() => StraightSetsArgsSchema)]).optional(),
  fixedChangeSets: z.union([z.boolean(),z.lazy(() => FixedChangeSetsArgsSchema)]).optional(),
  variableChangeSets: z.union([z.boolean(),z.lazy(() => VariableChangeSetsArgsSchema)]).optional(),
  myorepMatchSets: z.union([z.boolean(),z.lazy(() => MyorepMatchSetsArgsSchema)]).optional(),
}).strict()

export const SetsOfWorkoutExerciseArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseDefaultArgs> = z.object({
  select: z.lazy(() => SetsOfWorkoutExerciseSelectSchema).optional(),
  include: z.lazy(() => SetsOfWorkoutExerciseIncludeSchema).optional(),
}).strict();

export const SetsOfWorkoutExerciseSelectSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseSelect> = z.object({
  id: z.boolean().optional(),
  setType: z.boolean().optional(),
  repRangeStart: z.boolean().optional(),
  repRangeEnd: z.boolean().optional(),
  workoutExercise: z.union([z.boolean(),z.lazy(() => WorkoutExerciseArgsSchema)]).optional(),
  straightSets: z.union([z.boolean(),z.lazy(() => StraightSetsArgsSchema)]).optional(),
  fixedChangeSets: z.union([z.boolean(),z.lazy(() => FixedChangeSetsArgsSchema)]).optional(),
  variableChangeSets: z.union([z.boolean(),z.lazy(() => VariableChangeSetsArgsSchema)]).optional(),
  myorepMatchSets: z.union([z.boolean(),z.lazy(() => MyorepMatchSetsArgsSchema)]).optional(),
}).strict()

// STRAIGHT SETS
//------------------------------------------------------

export const StraightSetsIncludeSchema: z.ZodType<Prisma.StraightSetsInclude> = z.object({
  setsOfWorkoutExercise: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
}).strict()

export const StraightSetsArgsSchema: z.ZodType<Prisma.StraightSetsDefaultArgs> = z.object({
  select: z.lazy(() => StraightSetsSelectSchema).optional(),
  include: z.lazy(() => StraightSetsIncludeSchema).optional(),
}).strict();

export const StraightSetsSelectSchema: z.ZodType<Prisma.StraightSetsSelect> = z.object({
  id: z.boolean().optional(),
  load: z.boolean().optional(),
  repNumbers: z.boolean().optional(),
  RIRNumbers: z.boolean().optional(),
  setsOfWorkoutExerciseId: z.boolean().optional(),
  setsOfWorkoutExercise: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
}).strict()

// FIXED CHANGE SETS
//------------------------------------------------------

export const FixedChangeSetsIncludeSchema: z.ZodType<Prisma.FixedChangeSetsInclude> = z.object({
  setsOfWorkoutExercise: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
}).strict()

export const FixedChangeSetsArgsSchema: z.ZodType<Prisma.FixedChangeSetsDefaultArgs> = z.object({
  select: z.lazy(() => FixedChangeSetsSelectSchema).optional(),
  include: z.lazy(() => FixedChangeSetsIncludeSchema).optional(),
}).strict();

export const FixedChangeSetsSelectSchema: z.ZodType<Prisma.FixedChangeSetsSelect> = z.object({
  id: z.boolean().optional(),
  loadNumbers: z.boolean().optional(),
  repNumbers: z.boolean().optional(),
  RIRNumbers: z.boolean().optional(),
  changeType: z.boolean().optional(),
  changeAmount: z.boolean().optional(),
  setsOfWorkoutExerciseId: z.boolean().optional(),
  setsOfWorkoutExercise: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
}).strict()

// VARIABLE CHANGE SETS
//------------------------------------------------------

export const VariableChangeSetsIncludeSchema: z.ZodType<Prisma.VariableChangeSetsInclude> = z.object({
  setsOfWorkoutExercise: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
}).strict()

export const VariableChangeSetsArgsSchema: z.ZodType<Prisma.VariableChangeSetsDefaultArgs> = z.object({
  select: z.lazy(() => VariableChangeSetsSelectSchema).optional(),
  include: z.lazy(() => VariableChangeSetsIncludeSchema).optional(),
}).strict();

export const VariableChangeSetsSelectSchema: z.ZodType<Prisma.VariableChangeSetsSelect> = z.object({
  id: z.boolean().optional(),
  loadNumbers: z.boolean().optional(),
  repNumbers: z.boolean().optional(),
  RIRNumbers: z.boolean().optional(),
  setsOfWorkoutExerciseId: z.boolean().optional(),
  setsOfWorkoutExercise: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
}).strict()

// MYOREP MATCH SETS
//------------------------------------------------------

export const MyorepMatchSetsIncludeSchema: z.ZodType<Prisma.MyorepMatchSetsInclude> = z.object({
  myorepMatchSets: z.union([z.boolean(),z.lazy(() => MyorepMatchSetFindManyArgsSchema)]).optional(),
  setsOfWorkoutExercise: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => MyorepMatchSetsCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const MyorepMatchSetsArgsSchema: z.ZodType<Prisma.MyorepMatchSetsDefaultArgs> = z.object({
  select: z.lazy(() => MyorepMatchSetsSelectSchema).optional(),
  include: z.lazy(() => MyorepMatchSetsIncludeSchema).optional(),
}).strict();

export const MyorepMatchSetsCountOutputTypeArgsSchema: z.ZodType<Prisma.MyorepMatchSetsCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => MyorepMatchSetsCountOutputTypeSelectSchema).nullish(),
}).strict();

export const MyorepMatchSetsCountOutputTypeSelectSchema: z.ZodType<Prisma.MyorepMatchSetsCountOutputTypeSelect> = z.object({
  myorepMatchSets: z.boolean().optional(),
}).strict();

export const MyorepMatchSetsSelectSchema: z.ZodType<Prisma.MyorepMatchSetsSelect> = z.object({
  id: z.boolean().optional(),
  setsOfWorkoutExerciseId: z.boolean().optional(),
  myorepMatchSets: z.union([z.boolean(),z.lazy(() => MyorepMatchSetFindManyArgsSchema)]).optional(),
  setsOfWorkoutExercise: z.union([z.boolean(),z.lazy(() => SetsOfWorkoutExerciseArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => MyorepMatchSetsCountOutputTypeArgsSchema)]).optional(),
}).strict()

// MYOREP MATCH SET
//------------------------------------------------------

export const MyorepMatchSetIncludeSchema: z.ZodType<Prisma.MyorepMatchSetInclude> = z.object({
  myorepMatchSets: z.union([z.boolean(),z.lazy(() => MyorepMatchSetsArgsSchema)]).optional(),
}).strict()

export const MyorepMatchSetArgsSchema: z.ZodType<Prisma.MyorepMatchSetDefaultArgs> = z.object({
  select: z.lazy(() => MyorepMatchSetSelectSchema).optional(),
  include: z.lazy(() => MyorepMatchSetIncludeSchema).optional(),
}).strict();

export const MyorepMatchSetSelectSchema: z.ZodType<Prisma.MyorepMatchSetSelect> = z.object({
  id: z.boolean().optional(),
  repNumber: z.boolean().optional(),
  loadNumber: z.boolean().optional(),
  myoreps: z.boolean().optional(),
  myorepMatchSetsId: z.boolean().optional(),
  myorepMatchSets: z.union([z.boolean(),z.lazy(() => MyorepMatchSetsArgsSchema)]).optional(),
}).strict()


/////////////////////////////////////////
// INPUT TYPES
/////////////////////////////////////////

export const ExerciseSplitWhereInputSchema: z.ZodType<Prisma.ExerciseSplitWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ExerciseSplitWhereInputSchema),z.lazy(() => ExerciseSplitWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseSplitWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseSplitWhereInputSchema),z.lazy(() => ExerciseSplitWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayListRelationFilterSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleListRelationFilterSchema).optional()
}).strict();

export const ExerciseSplitOrderByWithRelationInputSchema: z.ZodType<Prisma.ExerciseSplitOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayOrderByRelationAggregateInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleOrderByRelationAggregateInputSchema).optional()
}).strict();

export const ExerciseSplitWhereUniqueInputSchema: z.ZodType<Prisma.ExerciseSplitWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => ExerciseSplitWhereInputSchema),z.lazy(() => ExerciseSplitWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseSplitWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseSplitWhereInputSchema),z.lazy(() => ExerciseSplitWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayListRelationFilterSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleListRelationFilterSchema).optional()
}).strict());

export const ExerciseSplitOrderByWithAggregationInputSchema: z.ZodType<Prisma.ExerciseSplitOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ExerciseSplitCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ExerciseSplitMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ExerciseSplitMinOrderByAggregateInputSchema).optional()
}).strict();

export const ExerciseSplitScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ExerciseSplitScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ExerciseSplitScalarWhereWithAggregatesInputSchema),z.lazy(() => ExerciseSplitScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseSplitScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseSplitScalarWhereWithAggregatesInputSchema),z.lazy(() => ExerciseSplitScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const ExerciseSplitDayWhereInputSchema: z.ZodType<Prisma.ExerciseSplitDayWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ExerciseSplitDayWhereInputSchema),z.lazy(() => ExerciseSplitDayWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseSplitDayWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseSplitDayWhereInputSchema),z.lazy(() => ExerciseSplitDayWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  dayIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  isRestDay: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  exerciseSplitId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exercises: z.lazy(() => ExerciseTemplateListRelationFilterSchema).optional(),
  exerciseSplit: z.union([ z.lazy(() => ExerciseSplitRelationFilterSchema),z.lazy(() => ExerciseSplitWhereInputSchema) ]).optional(),
}).strict();

export const ExerciseSplitDayOrderByWithRelationInputSchema: z.ZodType<Prisma.ExerciseSplitDayOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.lazy(() => SortOrderSchema).optional(),
  exercises: z.lazy(() => ExerciseTemplateOrderByRelationAggregateInputSchema).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitOrderByWithRelationInputSchema).optional()
}).strict();

export const ExerciseSplitDayWhereUniqueInputSchema: z.ZodType<Prisma.ExerciseSplitDayWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => ExerciseSplitDayWhereInputSchema),z.lazy(() => ExerciseSplitDayWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseSplitDayWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseSplitDayWhereInputSchema),z.lazy(() => ExerciseSplitDayWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  dayIndex: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  isRestDay: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  exerciseSplitId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exercises: z.lazy(() => ExerciseTemplateListRelationFilterSchema).optional(),
  exerciseSplit: z.union([ z.lazy(() => ExerciseSplitRelationFilterSchema),z.lazy(() => ExerciseSplitWhereInputSchema) ]).optional(),
}).strict());

export const ExerciseSplitDayOrderByWithAggregationInputSchema: z.ZodType<Prisma.ExerciseSplitDayOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ExerciseSplitDayCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => ExerciseSplitDayAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ExerciseSplitDayMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ExerciseSplitDayMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => ExerciseSplitDaySumOrderByAggregateInputSchema).optional()
}).strict();

export const ExerciseSplitDayScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ExerciseSplitDayScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ExerciseSplitDayScalarWhereWithAggregatesInputSchema),z.lazy(() => ExerciseSplitDayScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseSplitDayScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseSplitDayScalarWhereWithAggregatesInputSchema),z.lazy(() => ExerciseSplitDayScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  dayIndex: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  isRestDay: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  exerciseSplitId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const ExerciseTemplateWhereInputSchema: z.ZodType<Prisma.ExerciseTemplateWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ExerciseTemplateWhereInputSchema),z.lazy(() => ExerciseTemplateWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseTemplateWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseTemplateWhereInputSchema),z.lazy(() => ExerciseTemplateWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeNullableFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  note: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  exerciseSplitDayId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseSplitDay: z.union([ z.lazy(() => ExerciseSplitDayRelationFilterSchema),z.lazy(() => ExerciseSplitDayWhereInputSchema) ]).optional(),
}).strict();

export const ExerciseTemplateOrderByWithRelationInputSchema: z.ZodType<Prisma.ExerciseTemplateOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  changeAmount: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  note: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  exerciseSplitDayId: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitDay: z.lazy(() => ExerciseSplitDayOrderByWithRelationInputSchema).optional()
}).strict();

export const ExerciseTemplateWhereUniqueInputSchema: z.ZodType<Prisma.ExerciseTemplateWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => ExerciseTemplateWhereInputSchema),z.lazy(() => ExerciseTemplateWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseTemplateWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseTemplateWhereInputSchema),z.lazy(() => ExerciseTemplateWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeNullableFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  note: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  exerciseSplitDayId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseSplitDay: z.union([ z.lazy(() => ExerciseSplitDayRelationFilterSchema),z.lazy(() => ExerciseSplitDayWhereInputSchema) ]).optional(),
}).strict());

export const ExerciseTemplateOrderByWithAggregationInputSchema: z.ZodType<Prisma.ExerciseTemplateOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  changeAmount: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  note: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  exerciseSplitDayId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ExerciseTemplateCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => ExerciseTemplateAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ExerciseTemplateMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ExerciseTemplateMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => ExerciseTemplateSumOrderByAggregateInputSchema).optional()
}).strict();

export const ExerciseTemplateScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ExerciseTemplateScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ExerciseTemplateScalarWhereWithAggregatesInputSchema),z.lazy(() => ExerciseTemplateScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseTemplateScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseTemplateScalarWhereWithAggregatesInputSchema),z.lazy(() => ExerciseTemplateScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupWithAggregatesFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeWithAggregatesFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeNullableWithAggregatesFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.lazy(() => FloatNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  note: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  exerciseSplitDayId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const MesocycleWhereInputSchema: z.ZodType<Prisma.MesocycleWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleWhereInputSchema),z.lazy(() => MesocycleWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleWhereInputSchema),z.lazy(() => MesocycleWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseSplitId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  RIRProgression: z.lazy(() => IntNullableListFilterSchema).optional(),
  startDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  endDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.lazy(() => FloatFilterSchema),z.number() ]).optional(),
  lastSetToFailure: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  forceRIRMatching: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  exerciseSplit: z.union([ z.lazy(() => ExerciseSplitNullableRelationFilterSchema),z.lazy(() => ExerciseSplitWhereInputSchema) ]).optional().nullable(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayListRelationFilterSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeListRelationFilterSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleListRelationFilterSchema).optional()
}).strict();

export const MesocycleOrderByWithRelationInputSchema: z.ZodType<Prisma.MesocycleOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  RIRProgression: z.lazy(() => SortOrderSchema).optional(),
  startDate: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  endDate: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  startOverloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitOrderByWithRelationInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayOrderByRelationAggregateInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeOrderByRelationAggregateInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleOrderByRelationAggregateInputSchema).optional()
}).strict();

export const MesocycleWhereUniqueInputSchema: z.ZodType<Prisma.MesocycleWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => MesocycleWhereInputSchema),z.lazy(() => MesocycleWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleWhereInputSchema),z.lazy(() => MesocycleWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseSplitId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  RIRProgression: z.lazy(() => IntNullableListFilterSchema).optional(),
  startDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  endDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.lazy(() => FloatFilterSchema),z.number() ]).optional(),
  lastSetToFailure: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  forceRIRMatching: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  exerciseSplit: z.union([ z.lazy(() => ExerciseSplitNullableRelationFilterSchema),z.lazy(() => ExerciseSplitWhereInputSchema) ]).optional().nullable(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayListRelationFilterSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeListRelationFilterSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleListRelationFilterSchema).optional()
}).strict());

export const MesocycleOrderByWithAggregationInputSchema: z.ZodType<Prisma.MesocycleOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  RIRProgression: z.lazy(() => SortOrderSchema).optional(),
  startDate: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  endDate: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  startOverloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => MesocycleCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => MesocycleAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MesocycleMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MesocycleMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => MesocycleSumOrderByAggregateInputSchema).optional()
}).strict();

export const MesocycleScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MesocycleScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleScalarWhereWithAggregatesInputSchema),z.lazy(() => MesocycleScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleScalarWhereWithAggregatesInputSchema),z.lazy(() => MesocycleScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  exerciseSplitId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  RIRProgression: z.lazy(() => IntNullableListFilterSchema).optional(),
  startDate: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  endDate: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableWithAggregatesFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.lazy(() => FloatWithAggregatesFilterSchema),z.number() ]).optional(),
  lastSetToFailure: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  forceRIRMatching: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeWhereInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  muscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  setIncreaseAmount: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  maxVolume: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  mesocycle: z.union([ z.lazy(() => MesocycleRelationFilterSchema),z.lazy(() => MesocycleWhereInputSchema) ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeOrderByWithRelationInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  muscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  regardlessOfProgress: z.lazy(() => SortOrderSchema).optional(),
  setIncreaseAmount: z.lazy(() => SortOrderSchema).optional(),
  maxVolume: z.lazy(() => SortOrderSchema).optional(),
  mesocycle: z.lazy(() => MesocycleOrderByWithRelationInputSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeWhereUniqueInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema).array() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  muscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  setIncreaseAmount: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  maxVolume: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  mesocycle: z.union([ z.lazy(() => MesocycleRelationFilterSchema),z.lazy(() => MesocycleWhereInputSchema) ]).optional(),
}).strict());

export const MesocycleCyclicSetChangeOrderByWithAggregationInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  muscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  regardlessOfProgress: z.lazy(() => SortOrderSchema).optional(),
  setIncreaseAmount: z.lazy(() => SortOrderSchema).optional(),
  maxVolume: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => MesocycleCyclicSetChangeCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => MesocycleCyclicSetChangeAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MesocycleCyclicSetChangeMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MesocycleCyclicSetChangeMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => MesocycleCyclicSetChangeSumOrderByAggregateInputSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleCyclicSetChangeScalarWhereWithAggregatesInputSchema),z.lazy(() => MesocycleCyclicSetChangeScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleCyclicSetChangeScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleCyclicSetChangeScalarWhereWithAggregatesInputSchema),z.lazy(() => MesocycleCyclicSetChangeScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  muscleGroup: z.union([ z.lazy(() => EnumMuscleGroupWithAggregatesFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  setIncreaseAmount: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  maxVolume: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
}).strict();

export const MesocycleExerciseSplitDayWhereInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  dayIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  isRestDay: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  mesocycle: z.union([ z.lazy(() => MesocycleRelationFilterSchema),z.lazy(() => MesocycleWhereInputSchema) ]).optional(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateListRelationFilterSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayOrderByWithRelationInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  mesocycle: z.lazy(() => MesocycleOrderByWithRelationInputSchema).optional(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateOrderByRelationAggregateInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayWhereUniqueInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  dayIndex: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  isRestDay: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  mesocycle: z.union([ z.lazy(() => MesocycleRelationFilterSchema),z.lazy(() => MesocycleWhereInputSchema) ]).optional(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateListRelationFilterSchema).optional()
}).strict());

export const MesocycleExerciseSplitDayOrderByWithAggregationInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => MesocycleExerciseSplitDayCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => MesocycleExerciseSplitDayAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MesocycleExerciseSplitDayMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MesocycleExerciseSplitDayMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => MesocycleExerciseSplitDaySumOrderByAggregateInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleExerciseSplitDayScalarWhereWithAggregatesInputSchema),z.lazy(() => MesocycleExerciseSplitDayScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleExerciseSplitDayScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleExerciseSplitDayScalarWhereWithAggregatesInputSchema),z.lazy(() => MesocycleExerciseSplitDayScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  dayIndex: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  isRestDay: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const MesocycleExerciseTemplateWhereInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleExerciseTemplateWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  sets: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeNullableFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  note: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  mesocycleExerciseSplitDayId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableNullableFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  lastSetToFailure: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  forceRIRMatching: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  mesocycleExerciseSplitDay: z.union([ z.lazy(() => MesocycleExerciseSplitDayRelationFilterSchema),z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema) ]).optional(),
}).strict();

export const MesocycleExerciseTemplateOrderByWithRelationInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  sets: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  changeAmount: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  note: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  mesocycleExerciseSplitDayId: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  overloadPercentage: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  mesocycleExerciseSplitDay: z.lazy(() => MesocycleExerciseSplitDayOrderByWithRelationInputSchema).optional()
}).strict();

export const MesocycleExerciseTemplateWhereUniqueInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleExerciseTemplateWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  sets: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeNullableFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  note: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  mesocycleExerciseSplitDayId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableNullableFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  lastSetToFailure: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  forceRIRMatching: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  mesocycleExerciseSplitDay: z.union([ z.lazy(() => MesocycleExerciseSplitDayRelationFilterSchema),z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema) ]).optional(),
}).strict());

export const MesocycleExerciseTemplateOrderByWithAggregationInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  sets: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  changeAmount: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  note: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  mesocycleExerciseSplitDayId: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  overloadPercentage: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => MesocycleExerciseTemplateCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => MesocycleExerciseTemplateAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MesocycleExerciseTemplateMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MesocycleExerciseTemplateMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => MesocycleExerciseTemplateSumOrderByAggregateInputSchema).optional()
}).strict();

export const MesocycleExerciseTemplateScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleExerciseTemplateScalarWhereWithAggregatesInputSchema),z.lazy(() => MesocycleExerciseTemplateScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleExerciseTemplateScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleExerciseTemplateScalarWhereWithAggregatesInputSchema),z.lazy(() => MesocycleExerciseTemplateScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupWithAggregatesFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  sets: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeWithAggregatesFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeNullableWithAggregatesFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.lazy(() => FloatNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  note: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  mesocycleExerciseSplitDayId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableNullableWithAggregatesFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.lazy(() => FloatNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  lastSetToFailure: z.union([ z.lazy(() => BoolNullableWithAggregatesFilterSchema),z.boolean() ]).optional().nullable(),
  forceRIRMatching: z.union([ z.lazy(() => BoolNullableWithAggregatesFilterSchema),z.boolean() ]).optional().nullable(),
}).strict();

export const UserWhereInputSchema: z.ZodType<Prisma.UserWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  email: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  emailVerified: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  image: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  accounts: z.lazy(() => AccountListRelationFilterSchema).optional(),
  sessions: z.lazy(() => SessionListRelationFilterSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitListRelationFilterSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleListRelationFilterSchema).optional(),
  Workout: z.lazy(() => WorkoutListRelationFilterSchema).optional()
}).strict();

export const UserOrderByWithRelationInputSchema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  image: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  accounts: z.lazy(() => AccountOrderByRelationAggregateInputSchema).optional(),
  sessions: z.lazy(() => SessionOrderByRelationAggregateInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitOrderByRelationAggregateInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleOrderByRelationAggregateInputSchema).optional(),
  Workout: z.lazy(() => WorkoutOrderByRelationAggregateInputSchema).optional()
}).strict();

export const UserWhereUniqueInputSchema: z.ZodType<Prisma.UserWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    email: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    email: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional(),
  AND: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  emailVerified: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  image: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  accounts: z.lazy(() => AccountListRelationFilterSchema).optional(),
  sessions: z.lazy(() => SessionListRelationFilterSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitListRelationFilterSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleListRelationFilterSchema).optional(),
  Workout: z.lazy(() => WorkoutListRelationFilterSchema).optional()
}).strict());

export const UserOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  image: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserMinOrderByAggregateInputSchema).optional()
}).strict();

export const UserScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema),z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema),z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  email: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  emailVerified: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  image: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const AccountWhereInputSchema: z.ZodType<Prisma.AccountWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AccountWhereInputSchema),z.lazy(() => AccountWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AccountWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AccountWhereInputSchema),z.lazy(() => AccountWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  type: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  provider: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  providerAccountId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  refresh_token: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  access_token: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  expires_at: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  token_type: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  scope: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  id_token: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  session_state: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict();

export const AccountOrderByWithRelationInputSchema: z.ZodType<Prisma.AccountOrderByWithRelationInput> = z.object({
  userId: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  provider: z.lazy(() => SortOrderSchema).optional(),
  providerAccountId: z.lazy(() => SortOrderSchema).optional(),
  refresh_token: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  access_token: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  expires_at: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  token_type: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  id_token: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  session_state: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional()
}).strict();

export const AccountWhereUniqueInputSchema: z.ZodType<Prisma.AccountWhereUniqueInput> = z.object({
  provider_providerAccountId: z.lazy(() => AccountProviderProviderAccountIdCompoundUniqueInputSchema)
})
.and(z.object({
  provider_providerAccountId: z.lazy(() => AccountProviderProviderAccountIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => AccountWhereInputSchema),z.lazy(() => AccountWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AccountWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AccountWhereInputSchema),z.lazy(() => AccountWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  type: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  provider: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  providerAccountId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  refresh_token: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  access_token: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  expires_at: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  token_type: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  scope: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  id_token: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  session_state: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export const AccountOrderByWithAggregationInputSchema: z.ZodType<Prisma.AccountOrderByWithAggregationInput> = z.object({
  userId: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  provider: z.lazy(() => SortOrderSchema).optional(),
  providerAccountId: z.lazy(() => SortOrderSchema).optional(),
  refresh_token: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  access_token: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  expires_at: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  token_type: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  id_token: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  session_state: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => AccountCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => AccountAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => AccountMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => AccountMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => AccountSumOrderByAggregateInputSchema).optional()
}).strict();

export const AccountScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.AccountScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => AccountScalarWhereWithAggregatesInputSchema),z.lazy(() => AccountScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => AccountScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AccountScalarWhereWithAggregatesInputSchema),z.lazy(() => AccountScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  type: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  provider: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  providerAccountId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  refresh_token: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  access_token: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  expires_at: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  token_type: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  scope: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  id_token: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  session_state: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const SessionWhereInputSchema: z.ZodType<Prisma.SessionWhereInput> = z.object({
  AND: z.union([ z.lazy(() => SessionWhereInputSchema),z.lazy(() => SessionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SessionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SessionWhereInputSchema),z.lazy(() => SessionWhereInputSchema).array() ]).optional(),
  sessionToken: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  expires: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict();

export const SessionOrderByWithRelationInputSchema: z.ZodType<Prisma.SessionOrderByWithRelationInput> = z.object({
  sessionToken: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional()
}).strict();

export const SessionWhereUniqueInputSchema: z.ZodType<Prisma.SessionWhereUniqueInput> = z.object({
  sessionToken: z.string()
})
.and(z.object({
  sessionToken: z.string().optional(),
  AND: z.union([ z.lazy(() => SessionWhereInputSchema),z.lazy(() => SessionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SessionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SessionWhereInputSchema),z.lazy(() => SessionWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  expires: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export const SessionOrderByWithAggregationInputSchema: z.ZodType<Prisma.SessionOrderByWithAggregationInput> = z.object({
  sessionToken: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => SessionCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => SessionMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => SessionMinOrderByAggregateInputSchema).optional()
}).strict();

export const SessionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.SessionScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => SessionScalarWhereWithAggregatesInputSchema),z.lazy(() => SessionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => SessionScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SessionScalarWhereWithAggregatesInputSchema),z.lazy(() => SessionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  sessionToken: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  expires: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const VerificationTokenWhereInputSchema: z.ZodType<Prisma.VerificationTokenWhereInput> = z.object({
  AND: z.union([ z.lazy(() => VerificationTokenWhereInputSchema),z.lazy(() => VerificationTokenWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => VerificationTokenWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VerificationTokenWhereInputSchema),z.lazy(() => VerificationTokenWhereInputSchema).array() ]).optional(),
  identifier: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  token: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  expires: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const VerificationTokenOrderByWithRelationInputSchema: z.ZodType<Prisma.VerificationTokenOrderByWithRelationInput> = z.object({
  identifier: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const VerificationTokenWhereUniqueInputSchema: z.ZodType<Prisma.VerificationTokenWhereUniqueInput> = z.object({
  identifier_token: z.lazy(() => VerificationTokenIdentifierTokenCompoundUniqueInputSchema)
})
.and(z.object({
  identifier_token: z.lazy(() => VerificationTokenIdentifierTokenCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => VerificationTokenWhereInputSchema),z.lazy(() => VerificationTokenWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => VerificationTokenWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VerificationTokenWhereInputSchema),z.lazy(() => VerificationTokenWhereInputSchema).array() ]).optional(),
  identifier: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  token: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  expires: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict());

export const VerificationTokenOrderByWithAggregationInputSchema: z.ZodType<Prisma.VerificationTokenOrderByWithAggregationInput> = z.object({
  identifier: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => VerificationTokenCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => VerificationTokenMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => VerificationTokenMinOrderByAggregateInputSchema).optional()
}).strict();

export const VerificationTokenScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.VerificationTokenScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => VerificationTokenScalarWhereWithAggregatesInputSchema),z.lazy(() => VerificationTokenScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => VerificationTokenScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VerificationTokenScalarWhereWithAggregatesInputSchema),z.lazy(() => VerificationTokenScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  identifier: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  token: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  expires: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const WorkoutOfMesocycleWhereInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleWhereInput> = z.object({
  AND: z.union([ z.lazy(() => WorkoutOfMesocycleWhereInputSchema),z.lazy(() => WorkoutOfMesocycleWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutOfMesocycleWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutOfMesocycleWhereInputSchema),z.lazy(() => WorkoutOfMesocycleWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  workoutId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  splitDayName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  workoutStatus: z.union([ z.lazy(() => EnumWorkoutStatusNullableFilterSchema),z.lazy(() => WorkoutStatusSchema) ]).optional().nullable(),
  workout: z.union([ z.lazy(() => WorkoutRelationFilterSchema),z.lazy(() => WorkoutWhereInputSchema) ]).optional(),
  mesocycle: z.union([ z.lazy(() => MesocycleRelationFilterSchema),z.lazy(() => MesocycleWhereInputSchema) ]).optional(),
}).strict();

export const WorkoutOfMesocycleOrderByWithRelationInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  splitDayName: z.lazy(() => SortOrderSchema).optional(),
  workoutStatus: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  workout: z.lazy(() => WorkoutOrderByWithRelationInputSchema).optional(),
  mesocycle: z.lazy(() => MesocycleOrderByWithRelationInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleWhereUniqueInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    workoutId: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    workoutId: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  workoutId: z.string().optional(),
  AND: z.union([ z.lazy(() => WorkoutOfMesocycleWhereInputSchema),z.lazy(() => WorkoutOfMesocycleWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutOfMesocycleWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutOfMesocycleWhereInputSchema),z.lazy(() => WorkoutOfMesocycleWhereInputSchema).array() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  splitDayName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  workoutStatus: z.union([ z.lazy(() => EnumWorkoutStatusNullableFilterSchema),z.lazy(() => WorkoutStatusSchema) ]).optional().nullable(),
  workout: z.union([ z.lazy(() => WorkoutRelationFilterSchema),z.lazy(() => WorkoutWhereInputSchema) ]).optional(),
  mesocycle: z.union([ z.lazy(() => MesocycleRelationFilterSchema),z.lazy(() => MesocycleWhereInputSchema) ]).optional(),
}).strict());

export const WorkoutOfMesocycleOrderByWithAggregationInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  splitDayName: z.lazy(() => SortOrderSchema).optional(),
  workoutStatus: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => WorkoutOfMesocycleCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => WorkoutOfMesocycleMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => WorkoutOfMesocycleMinOrderByAggregateInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => WorkoutOfMesocycleScalarWhereWithAggregatesInputSchema),z.lazy(() => WorkoutOfMesocycleScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutOfMesocycleScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutOfMesocycleScalarWhereWithAggregatesInputSchema),z.lazy(() => WorkoutOfMesocycleScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  workoutId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  splitDayName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  workoutStatus: z.union([ z.lazy(() => EnumWorkoutStatusNullableWithAggregatesFilterSchema),z.lazy(() => WorkoutStatusSchema) ]).optional().nullable(),
}).strict();

export const WorkoutWhereInputSchema: z.ZodType<Prisma.WorkoutWhereInput> = z.object({
  AND: z.union([ z.lazy(() => WorkoutWhereInputSchema),z.lazy(() => WorkoutWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutWhereInputSchema),z.lazy(() => WorkoutWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  workoutOfMesocycle: z.union([ z.lazy(() => WorkoutOfMesocycleNullableRelationFilterSchema),z.lazy(() => WorkoutOfMesocycleWhereInputSchema) ]).optional().nullable(),
  workoutExercises: z.lazy(() => WorkoutExerciseListRelationFilterSchema).optional()
}).strict();

export const WorkoutOrderByWithRelationInputSchema: z.ZodType<Prisma.WorkoutOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleOrderByWithRelationInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseOrderByRelationAggregateInputSchema).optional()
}).strict();

export const WorkoutWhereUniqueInputSchema: z.ZodType<Prisma.WorkoutWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => WorkoutWhereInputSchema),z.lazy(() => WorkoutWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutWhereInputSchema),z.lazy(() => WorkoutWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  user: z.union([ z.lazy(() => UserRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  workoutOfMesocycle: z.union([ z.lazy(() => WorkoutOfMesocycleNullableRelationFilterSchema),z.lazy(() => WorkoutOfMesocycleWhereInputSchema) ]).optional().nullable(),
  workoutExercises: z.lazy(() => WorkoutExerciseListRelationFilterSchema).optional()
}).strict());

export const WorkoutOrderByWithAggregationInputSchema: z.ZodType<Prisma.WorkoutOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => WorkoutCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => WorkoutMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => WorkoutMinOrderByAggregateInputSchema).optional()
}).strict();

export const WorkoutScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.WorkoutScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => WorkoutScalarWhereWithAggregatesInputSchema),z.lazy(() => WorkoutScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutScalarWhereWithAggregatesInputSchema),z.lazy(() => WorkoutScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const WorkoutExerciseWhereInputSchema: z.ZodType<Prisma.WorkoutExerciseWhereInput> = z.object({
  AND: z.union([ z.lazy(() => WorkoutExerciseWhereInputSchema),z.lazy(() => WorkoutExerciseWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutExerciseWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutExerciseWhereInputSchema),z.lazy(() => WorkoutExerciseWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  workoutId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  note: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableNullableFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  lastSetToFailure: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  forceRIRMatching: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  minimumWeightChange: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  workout: z.union([ z.lazy(() => WorkoutRelationFilterSchema),z.lazy(() => WorkoutWhereInputSchema) ]).optional(),
  setData: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict();

export const WorkoutExerciseOrderByWithRelationInputSchema: z.ZodType<Prisma.WorkoutExerciseOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  note: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  overloadPercentage: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  minimumWeightChange: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  workout: z.lazy(() => WorkoutOrderByWithRelationInputSchema).optional(),
  setData: z.lazy(() => SetsOfWorkoutExerciseOrderByWithRelationInputSchema).optional()
}).strict();

export const WorkoutExerciseWhereUniqueInputSchema: z.ZodType<Prisma.WorkoutExerciseWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    setsOfWorkoutExerciseId: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    setsOfWorkoutExerciseId: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  setsOfWorkoutExerciseId: z.string().optional(),
  AND: z.union([ z.lazy(() => WorkoutExerciseWhereInputSchema),z.lazy(() => WorkoutExerciseWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutExerciseWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutExerciseWhereInputSchema),z.lazy(() => WorkoutExerciseWhereInputSchema).array() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  workoutId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  note: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableNullableFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  lastSetToFailure: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  forceRIRMatching: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  minimumWeightChange: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  workout: z.union([ z.lazy(() => WorkoutRelationFilterSchema),z.lazy(() => WorkoutWhereInputSchema) ]).optional(),
  setData: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict());

export const WorkoutExerciseOrderByWithAggregationInputSchema: z.ZodType<Prisma.WorkoutExerciseOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  note: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  overloadPercentage: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  minimumWeightChange: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => WorkoutExerciseCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => WorkoutExerciseAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => WorkoutExerciseMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => WorkoutExerciseMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => WorkoutExerciseSumOrderByAggregateInputSchema).optional()
}).strict();

export const WorkoutExerciseScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.WorkoutExerciseScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => WorkoutExerciseScalarWhereWithAggregatesInputSchema),z.lazy(() => WorkoutExerciseScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutExerciseScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutExerciseScalarWhereWithAggregatesInputSchema),z.lazy(() => WorkoutExerciseScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  workoutId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupWithAggregatesFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  note: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableNullableWithAggregatesFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.lazy(() => FloatNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  lastSetToFailure: z.union([ z.lazy(() => BoolNullableWithAggregatesFilterSchema),z.boolean() ]).optional().nullable(),
  forceRIRMatching: z.union([ z.lazy(() => BoolNullableWithAggregatesFilterSchema),z.boolean() ]).optional().nullable(),
  minimumWeightChange: z.union([ z.lazy(() => FloatNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const SetsOfWorkoutExerciseWhereInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseWhereInput> = z.object({
  AND: z.union([ z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  workoutExercise: z.union([ z.lazy(() => WorkoutExerciseNullableRelationFilterSchema),z.lazy(() => WorkoutExerciseWhereInputSchema) ]).optional().nullable(),
  straightSets: z.union([ z.lazy(() => StraightSetsNullableRelationFilterSchema),z.lazy(() => StraightSetsWhereInputSchema) ]).optional().nullable(),
  fixedChangeSets: z.union([ z.lazy(() => FixedChangeSetsNullableRelationFilterSchema),z.lazy(() => FixedChangeSetsWhereInputSchema) ]).optional().nullable(),
  variableChangeSets: z.union([ z.lazy(() => VariableChangeSetsNullableRelationFilterSchema),z.lazy(() => VariableChangeSetsWhereInputSchema) ]).optional().nullable(),
  myorepMatchSets: z.union([ z.lazy(() => MyorepMatchSetsNullableRelationFilterSchema),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional().nullable(),
}).strict();

export const SetsOfWorkoutExerciseOrderByWithRelationInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseOrderByWithRelationInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsOrderByWithRelationInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsOrderByWithRelationInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsOrderByWithRelationInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsOrderByWithRelationInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseWhereUniqueInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).array() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  workoutExercise: z.union([ z.lazy(() => WorkoutExerciseNullableRelationFilterSchema),z.lazy(() => WorkoutExerciseWhereInputSchema) ]).optional().nullable(),
  straightSets: z.union([ z.lazy(() => StraightSetsNullableRelationFilterSchema),z.lazy(() => StraightSetsWhereInputSchema) ]).optional().nullable(),
  fixedChangeSets: z.union([ z.lazy(() => FixedChangeSetsNullableRelationFilterSchema),z.lazy(() => FixedChangeSetsWhereInputSchema) ]).optional().nullable(),
  variableChangeSets: z.union([ z.lazy(() => VariableChangeSetsNullableRelationFilterSchema),z.lazy(() => VariableChangeSetsWhereInputSchema) ]).optional().nullable(),
  myorepMatchSets: z.union([ z.lazy(() => MyorepMatchSetsNullableRelationFilterSchema),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional().nullable(),
}).strict());

export const SetsOfWorkoutExerciseOrderByWithAggregationInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => SetsOfWorkoutExerciseCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => SetsOfWorkoutExerciseAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => SetsOfWorkoutExerciseMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => SetsOfWorkoutExerciseMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => SetsOfWorkoutExerciseSumOrderByAggregateInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => SetsOfWorkoutExerciseScalarWhereWithAggregatesInputSchema),z.lazy(() => SetsOfWorkoutExerciseScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => SetsOfWorkoutExerciseScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SetsOfWorkoutExerciseScalarWhereWithAggregatesInputSchema),z.lazy(() => SetsOfWorkoutExerciseScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeWithAggregatesFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
}).strict();

export const StraightSetsWhereInputSchema: z.ZodType<Prisma.StraightSetsWhereInput> = z.object({
  AND: z.union([ z.lazy(() => StraightSetsWhereInputSchema),z.lazy(() => StraightSetsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => StraightSetsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => StraightSetsWhereInputSchema),z.lazy(() => StraightSetsWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  load: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  repNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  RIRNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  setsOfWorkoutExercise: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict();

export const StraightSetsOrderByWithRelationInputSchema: z.ZodType<Prisma.StraightSetsOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  load: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseOrderByWithRelationInputSchema).optional()
}).strict();

export const StraightSetsWhereUniqueInputSchema: z.ZodType<Prisma.StraightSetsWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    setsOfWorkoutExerciseId: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    setsOfWorkoutExerciseId: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  setsOfWorkoutExerciseId: z.string().optional(),
  AND: z.union([ z.lazy(() => StraightSetsWhereInputSchema),z.lazy(() => StraightSetsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => StraightSetsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => StraightSetsWhereInputSchema),z.lazy(() => StraightSetsWhereInputSchema).array() ]).optional(),
  load: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  repNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  RIRNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  setsOfWorkoutExercise: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict());

export const StraightSetsOrderByWithAggregationInputSchema: z.ZodType<Prisma.StraightSetsOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  load: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => StraightSetsCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => StraightSetsAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => StraightSetsMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => StraightSetsMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => StraightSetsSumOrderByAggregateInputSchema).optional()
}).strict();

export const StraightSetsScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.StraightSetsScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => StraightSetsScalarWhereWithAggregatesInputSchema),z.lazy(() => StraightSetsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => StraightSetsScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => StraightSetsScalarWhereWithAggregatesInputSchema),z.lazy(() => StraightSetsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  load: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  repNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  RIRNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const FixedChangeSetsWhereInputSchema: z.ZodType<Prisma.FixedChangeSetsWhereInput> = z.object({
  AND: z.union([ z.lazy(() => FixedChangeSetsWhereInputSchema),z.lazy(() => FixedChangeSetsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => FixedChangeSetsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => FixedChangeSetsWhereInputSchema),z.lazy(() => FixedChangeSetsWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  loadNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  repNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  RIRNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional(),
  changeAmount: z.union([ z.lazy(() => FloatFilterSchema),z.number() ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  setsOfWorkoutExercise: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict();

export const FixedChangeSetsOrderByWithRelationInputSchema: z.ZodType<Prisma.FixedChangeSetsOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseOrderByWithRelationInputSchema).optional()
}).strict();

export const FixedChangeSetsWhereUniqueInputSchema: z.ZodType<Prisma.FixedChangeSetsWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    setsOfWorkoutExerciseId: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    setsOfWorkoutExerciseId: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  setsOfWorkoutExerciseId: z.string().optional(),
  AND: z.union([ z.lazy(() => FixedChangeSetsWhereInputSchema),z.lazy(() => FixedChangeSetsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => FixedChangeSetsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => FixedChangeSetsWhereInputSchema),z.lazy(() => FixedChangeSetsWhereInputSchema).array() ]).optional(),
  loadNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  repNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  RIRNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional(),
  changeAmount: z.union([ z.lazy(() => FloatFilterSchema),z.number() ]).optional(),
  setsOfWorkoutExercise: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict());

export const FixedChangeSetsOrderByWithAggregationInputSchema: z.ZodType<Prisma.FixedChangeSetsOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => FixedChangeSetsCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => FixedChangeSetsAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => FixedChangeSetsMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => FixedChangeSetsMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => FixedChangeSetsSumOrderByAggregateInputSchema).optional()
}).strict();

export const FixedChangeSetsScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.FixedChangeSetsScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => FixedChangeSetsScalarWhereWithAggregatesInputSchema),z.lazy(() => FixedChangeSetsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => FixedChangeSetsScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => FixedChangeSetsScalarWhereWithAggregatesInputSchema),z.lazy(() => FixedChangeSetsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  loadNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  repNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  RIRNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeWithAggregatesFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional(),
  changeAmount: z.union([ z.lazy(() => FloatWithAggregatesFilterSchema),z.number() ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const VariableChangeSetsWhereInputSchema: z.ZodType<Prisma.VariableChangeSetsWhereInput> = z.object({
  AND: z.union([ z.lazy(() => VariableChangeSetsWhereInputSchema),z.lazy(() => VariableChangeSetsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => VariableChangeSetsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VariableChangeSetsWhereInputSchema),z.lazy(() => VariableChangeSetsWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  loadNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  repNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  RIRNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  setsOfWorkoutExercise: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict();

export const VariableChangeSetsOrderByWithRelationInputSchema: z.ZodType<Prisma.VariableChangeSetsOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseOrderByWithRelationInputSchema).optional()
}).strict();

export const VariableChangeSetsWhereUniqueInputSchema: z.ZodType<Prisma.VariableChangeSetsWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    setsOfWorkoutExerciseId: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    setsOfWorkoutExerciseId: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  setsOfWorkoutExerciseId: z.string().optional(),
  AND: z.union([ z.lazy(() => VariableChangeSetsWhereInputSchema),z.lazy(() => VariableChangeSetsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => VariableChangeSetsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VariableChangeSetsWhereInputSchema),z.lazy(() => VariableChangeSetsWhereInputSchema).array() ]).optional(),
  loadNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  repNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  RIRNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  setsOfWorkoutExercise: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict());

export const VariableChangeSetsOrderByWithAggregationInputSchema: z.ZodType<Prisma.VariableChangeSetsOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => VariableChangeSetsCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => VariableChangeSetsAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => VariableChangeSetsMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => VariableChangeSetsMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => VariableChangeSetsSumOrderByAggregateInputSchema).optional()
}).strict();

export const VariableChangeSetsScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.VariableChangeSetsScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => VariableChangeSetsScalarWhereWithAggregatesInputSchema),z.lazy(() => VariableChangeSetsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => VariableChangeSetsScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => VariableChangeSetsScalarWhereWithAggregatesInputSchema),z.lazy(() => VariableChangeSetsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  loadNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  repNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  RIRNumbers: z.lazy(() => IntNullableListFilterSchema).optional(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const MyorepMatchSetsWhereInputSchema: z.ZodType<Prisma.MyorepMatchSetsWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MyorepMatchSetsWhereInputSchema),z.lazy(() => MyorepMatchSetsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MyorepMatchSetsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MyorepMatchSetsWhereInputSchema),z.lazy(() => MyorepMatchSetsWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetListRelationFilterSchema).optional(),
  setsOfWorkoutExercise: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict();

export const MyorepMatchSetsOrderByWithRelationInputSchema: z.ZodType<Prisma.MyorepMatchSetsOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetOrderByRelationAggregateInputSchema).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseOrderByWithRelationInputSchema).optional()
}).strict();

export const MyorepMatchSetsWhereUniqueInputSchema: z.ZodType<Prisma.MyorepMatchSetsWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    setsOfWorkoutExerciseId: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    setsOfWorkoutExerciseId: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  setsOfWorkoutExerciseId: z.string().optional(),
  AND: z.union([ z.lazy(() => MyorepMatchSetsWhereInputSchema),z.lazy(() => MyorepMatchSetsWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MyorepMatchSetsWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MyorepMatchSetsWhereInputSchema),z.lazy(() => MyorepMatchSetsWhereInputSchema).array() ]).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetListRelationFilterSchema).optional(),
  setsOfWorkoutExercise: z.union([ z.lazy(() => SetsOfWorkoutExerciseRelationFilterSchema),z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema) ]).optional(),
}).strict());

export const MyorepMatchSetsOrderByWithAggregationInputSchema: z.ZodType<Prisma.MyorepMatchSetsOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => MyorepMatchSetsCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MyorepMatchSetsMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MyorepMatchSetsMinOrderByAggregateInputSchema).optional()
}).strict();

export const MyorepMatchSetsScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MyorepMatchSetsScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => MyorepMatchSetsScalarWhereWithAggregatesInputSchema),z.lazy(() => MyorepMatchSetsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => MyorepMatchSetsScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MyorepMatchSetsScalarWhereWithAggregatesInputSchema),z.lazy(() => MyorepMatchSetsScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const MyorepMatchSetWhereInputSchema: z.ZodType<Prisma.MyorepMatchSetWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MyorepMatchSetWhereInputSchema),z.lazy(() => MyorepMatchSetWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MyorepMatchSetWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MyorepMatchSetWhereInputSchema),z.lazy(() => MyorepMatchSetWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  repNumber: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  loadNumber: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  myoreps: z.lazy(() => IntNullableListFilterSchema).optional(),
  myorepMatchSetsId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  myorepMatchSets: z.union([ z.lazy(() => MyorepMatchSetsNullableRelationFilterSchema),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional().nullable(),
}).strict();

export const MyorepMatchSetOrderByWithRelationInputSchema: z.ZodType<Prisma.MyorepMatchSetOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  repNumber: z.lazy(() => SortOrderSchema).optional(),
  loadNumber: z.lazy(() => SortOrderSchema).optional(),
  myoreps: z.lazy(() => SortOrderSchema).optional(),
  myorepMatchSetsId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsOrderByWithRelationInputSchema).optional()
}).strict();

export const MyorepMatchSetWhereUniqueInputSchema: z.ZodType<Prisma.MyorepMatchSetWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => MyorepMatchSetWhereInputSchema),z.lazy(() => MyorepMatchSetWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MyorepMatchSetWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MyorepMatchSetWhereInputSchema),z.lazy(() => MyorepMatchSetWhereInputSchema).array() ]).optional(),
  repNumber: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  loadNumber: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  myoreps: z.lazy(() => IntNullableListFilterSchema).optional(),
  myorepMatchSetsId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  myorepMatchSets: z.union([ z.lazy(() => MyorepMatchSetsNullableRelationFilterSchema),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional().nullable(),
}).strict());

export const MyorepMatchSetOrderByWithAggregationInputSchema: z.ZodType<Prisma.MyorepMatchSetOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  repNumber: z.lazy(() => SortOrderSchema).optional(),
  loadNumber: z.lazy(() => SortOrderSchema).optional(),
  myoreps: z.lazy(() => SortOrderSchema).optional(),
  myorepMatchSetsId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => MyorepMatchSetCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => MyorepMatchSetAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MyorepMatchSetMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MyorepMatchSetMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => MyorepMatchSetSumOrderByAggregateInputSchema).optional()
}).strict();

export const MyorepMatchSetScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MyorepMatchSetScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => MyorepMatchSetScalarWhereWithAggregatesInputSchema),z.lazy(() => MyorepMatchSetScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => MyorepMatchSetScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MyorepMatchSetScalarWhereWithAggregatesInputSchema),z.lazy(() => MyorepMatchSetScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  repNumber: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  loadNumber: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  myoreps: z.lazy(() => IntNullableListFilterSchema).optional(),
  myorepMatchSetsId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
}).strict();

export const ExerciseSplitCreateInputSchema: z.ZodType<Prisma.ExerciseSplitCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  user: z.lazy(() => UserCreateNestedOneWithoutExerciseSplitsInputSchema),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayCreateNestedManyWithoutExerciseSplitInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleCreateNestedManyWithoutExerciseSplitInputSchema).optional()
}).strict();

export const ExerciseSplitUncheckedCreateInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayUncheckedCreateNestedManyWithoutExerciseSplitInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleUncheckedCreateNestedManyWithoutExerciseSplitInputSchema).optional()
}).strict();

export const ExerciseSplitUpdateInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutExerciseSplitsNestedInputSchema).optional(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayUpdateManyWithoutExerciseSplitNestedInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleUpdateManyWithoutExerciseSplitNestedInputSchema).optional()
}).strict();

export const ExerciseSplitUncheckedUpdateInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayUncheckedUpdateManyWithoutExerciseSplitNestedInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleUncheckedUpdateManyWithoutExerciseSplitNestedInputSchema).optional()
}).strict();

export const ExerciseSplitCreateManyInputSchema: z.ZodType<Prisma.ExerciseSplitCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string()
}).strict();

export const ExerciseSplitUpdateManyMutationInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ExerciseSplitUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ExerciseSplitDayCreateInputSchema: z.ZodType<Prisma.ExerciseSplitDayCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  exercises: z.lazy(() => ExerciseTemplateCreateNestedManyWithoutExerciseSplitDayInputSchema).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitCreateNestedOneWithoutExerciseSplitDaysInputSchema)
}).strict();

export const ExerciseSplitDayUncheckedCreateInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  exerciseSplitId: z.string(),
  exercises: z.lazy(() => ExerciseTemplateUncheckedCreateNestedManyWithoutExerciseSplitDayInputSchema).optional()
}).strict();

export const ExerciseSplitDayUpdateInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  exercises: z.lazy(() => ExerciseTemplateUpdateManyWithoutExerciseSplitDayNestedInputSchema).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitUpdateOneRequiredWithoutExerciseSplitDaysNestedInputSchema).optional()
}).strict();

export const ExerciseSplitDayUncheckedUpdateInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exercises: z.lazy(() => ExerciseTemplateUncheckedUpdateManyWithoutExerciseSplitDayNestedInputSchema).optional()
}).strict();

export const ExerciseSplitDayCreateManyInputSchema: z.ZodType<Prisma.ExerciseSplitDayCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  exerciseSplitId: z.string()
}).strict();

export const ExerciseSplitDayUpdateManyMutationInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ExerciseSplitDayUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ExerciseTemplateCreateInputSchema: z.ZodType<Prisma.ExerciseTemplateCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  exerciseSplitDay: z.lazy(() => ExerciseSplitDayCreateNestedOneWithoutExercisesInputSchema)
}).strict();

export const ExerciseTemplateUncheckedCreateInputSchema: z.ZodType<Prisma.ExerciseTemplateUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  exerciseSplitDayId: z.string()
}).strict();

export const ExerciseTemplateUpdateInputSchema: z.ZodType<Prisma.ExerciseTemplateUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  exerciseSplitDay: z.lazy(() => ExerciseSplitDayUpdateOneRequiredWithoutExercisesNestedInputSchema).optional()
}).strict();

export const ExerciseTemplateUncheckedUpdateInputSchema: z.ZodType<Prisma.ExerciseTemplateUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  exerciseSplitDayId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ExerciseTemplateCreateManyInputSchema: z.ZodType<Prisma.ExerciseTemplateCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  exerciseSplitDayId: z.string()
}).strict();

export const ExerciseTemplateUpdateManyMutationInputSchema: z.ZodType<Prisma.ExerciseTemplateUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const ExerciseTemplateUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ExerciseTemplateUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  exerciseSplitDayId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleCreateInputSchema: z.ZodType<Prisma.MesocycleCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  user: z.lazy(() => UserCreateNestedOneWithoutMesocycleInputSchema),
  exerciseSplit: z.lazy(() => ExerciseSplitCreateNestedOneWithoutUsedByMesocyclesInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayCreateNestedManyWithoutMesocycleInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleUncheckedCreateInputSchema: z.ZodType<Prisma.MesocycleUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  exerciseSplitId: z.string().optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleUpdateInputSchema: z.ZodType<Prisma.MesocycleUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMesocycleNestedInputSchema).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitUpdateOneWithoutUsedByMesocyclesNestedInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleUncheckedUpdateInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleCreateManyInputSchema: z.ZodType<Prisma.MesocycleCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  exerciseSplitId: z.string().optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean()
}).strict();

export const MesocycleUpdateManyMutationInputSchema: z.ZodType<Prisma.MesocycleUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeCreateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateInput> = z.object({
  id: z.string().cuid().optional(),
  muscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  regardlessOfProgress: z.boolean(),
  setIncreaseAmount: z.number().int(),
  maxVolume: z.number().int(),
  mesocycle: z.lazy(() => MesocycleCreateNestedOneWithoutMesocycleCyclicSetChangesInputSchema)
}).strict();

export const MesocycleCyclicSetChangeUncheckedCreateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  mesocycleId: z.string(),
  muscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  regardlessOfProgress: z.boolean(),
  setIncreaseAmount: z.number().int(),
  maxVolume: z.number().int()
}).strict();

export const MesocycleCyclicSetChangeUpdateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  muscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setIncreaseAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  maxVolume: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycle: z.lazy(() => MesocycleUpdateOneRequiredWithoutMesocycleCyclicSetChangesNestedInputSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeUncheckedUpdateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  muscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setIncreaseAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  maxVolume: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeCreateManyInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  mesocycleId: z.string(),
  muscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  regardlessOfProgress: z.boolean(),
  setIncreaseAmount: z.number().int(),
  maxVolume: z.number().int()
}).strict();

export const MesocycleCyclicSetChangeUpdateManyMutationInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  muscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setIncreaseAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  maxVolume: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  muscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setIncreaseAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  maxVolume: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleExerciseSplitDayCreateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  mesocycle: z.lazy(() => MesocycleCreateNestedOneWithoutMesocycleExerciseSplitDaysInputSchema),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateCreateNestedManyWithoutMesocycleExerciseSplitDayInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayUncheckedCreateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  mesocycleId: z.string(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateUncheckedCreateNestedManyWithoutMesocycleExerciseSplitDayInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayUpdateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycle: z.lazy(() => MesocycleUpdateOneRequiredWithoutMesocycleExerciseSplitDaysNestedInputSchema).optional(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateUpdateManyWithoutMesocycleExerciseSplitDayNestedInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayUncheckedUpdateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateUncheckedUpdateManyWithoutMesocycleExerciseSplitDayNestedInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayCreateManyInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  mesocycleId: z.string()
}).strict();

export const MesocycleExerciseSplitDayUpdateManyMutationInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleExerciseSplitDayUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleExerciseTemplateCreateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  sets: z.number().int(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable(),
  mesocycleExerciseSplitDay: z.lazy(() => MesocycleExerciseSplitDayCreateNestedOneWithoutMesocycleSplitDayExercisesInputSchema)
}).strict();

export const MesocycleExerciseTemplateUncheckedCreateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  sets: z.number().int(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  mesocycleExerciseSplitDayId: z.string(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable()
}).strict();

export const MesocycleExerciseTemplateUpdateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  sets: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mesocycleExerciseSplitDay: z.lazy(() => MesocycleExerciseSplitDayUpdateOneRequiredWithoutMesocycleSplitDayExercisesNestedInputSchema).optional()
}).strict();

export const MesocycleExerciseTemplateUncheckedUpdateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  sets: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mesocycleExerciseSplitDayId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const MesocycleExerciseTemplateCreateManyInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  sets: z.number().int(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  mesocycleExerciseSplitDayId: z.string(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable()
}).strict();

export const MesocycleExerciseTemplateUpdateManyMutationInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  sets: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const MesocycleExerciseTemplateUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  sets: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mesocycleExerciseSplitDayId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const UserCreateInputSchema: z.ZodType<Prisma.UserCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateInputSchema: z.ZodType<Prisma.UserUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUpdateInputSchema: z.ZodType<Prisma.UserUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateInputSchema: z.ZodType<Prisma.UserUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserCreateManyInputSchema: z.ZodType<Prisma.UserCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const UserUpdateManyMutationInputSchema: z.ZodType<Prisma.UserUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserUncheckedUpdateManyInputSchema: z.ZodType<Prisma.UserUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountCreateInputSchema: z.ZodType<Prisma.AccountCreateInput> = z.object({
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().optional().nullable(),
  access_token: z.string().optional().nullable(),
  expires_at: z.number().int().optional().nullable(),
  token_type: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  id_token: z.string().optional().nullable(),
  session_state: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutAccountsInputSchema)
}).strict();

export const AccountUncheckedCreateInputSchema: z.ZodType<Prisma.AccountUncheckedCreateInput> = z.object({
  userId: z.string(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().optional().nullable(),
  access_token: z.string().optional().nullable(),
  expires_at: z.number().int().optional().nullable(),
  token_type: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  id_token: z.string().optional().nullable(),
  session_state: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const AccountUpdateInputSchema: z.ZodType<Prisma.AccountUpdateInput> = z.object({
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  provider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerAccountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  refresh_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  access_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  expires_at: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  token_type: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  id_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  session_state: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutAccountsNestedInputSchema).optional()
}).strict();

export const AccountUncheckedUpdateInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateInput> = z.object({
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  provider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerAccountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  refresh_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  access_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  expires_at: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  token_type: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  id_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  session_state: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountCreateManyInputSchema: z.ZodType<Prisma.AccountCreateManyInput> = z.object({
  userId: z.string(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().optional().nullable(),
  access_token: z.string().optional().nullable(),
  expires_at: z.number().int().optional().nullable(),
  token_type: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  id_token: z.string().optional().nullable(),
  session_state: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const AccountUpdateManyMutationInputSchema: z.ZodType<Prisma.AccountUpdateManyMutationInput> = z.object({
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  provider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerAccountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  refresh_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  access_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  expires_at: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  token_type: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  id_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  session_state: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountUncheckedUpdateManyInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateManyInput> = z.object({
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  provider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerAccountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  refresh_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  access_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  expires_at: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  token_type: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  id_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  session_state: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionCreateInputSchema: z.ZodType<Prisma.SessionCreateInput> = z.object({
  sessionToken: z.string(),
  expires: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutSessionsInputSchema)
}).strict();

export const SessionUncheckedCreateInputSchema: z.ZodType<Prisma.SessionUncheckedCreateInput> = z.object({
  sessionToken: z.string(),
  userId: z.string(),
  expires: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const SessionUpdateInputSchema: z.ZodType<Prisma.SessionUpdateInput> = z.object({
  sessionToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutSessionsNestedInputSchema).optional()
}).strict();

export const SessionUncheckedUpdateInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateInput> = z.object({
  sessionToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionCreateManyInputSchema: z.ZodType<Prisma.SessionCreateManyInput> = z.object({
  sessionToken: z.string(),
  userId: z.string(),
  expires: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const SessionUpdateManyMutationInputSchema: z.ZodType<Prisma.SessionUpdateManyMutationInput> = z.object({
  sessionToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateManyInput> = z.object({
  sessionToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VerificationTokenCreateInputSchema: z.ZodType<Prisma.VerificationTokenCreateInput> = z.object({
  identifier: z.string(),
  token: z.string(),
  expires: z.coerce.date()
}).strict();

export const VerificationTokenUncheckedCreateInputSchema: z.ZodType<Prisma.VerificationTokenUncheckedCreateInput> = z.object({
  identifier: z.string(),
  token: z.string(),
  expires: z.coerce.date()
}).strict();

export const VerificationTokenUpdateInputSchema: z.ZodType<Prisma.VerificationTokenUpdateInput> = z.object({
  identifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VerificationTokenUncheckedUpdateInputSchema: z.ZodType<Prisma.VerificationTokenUncheckedUpdateInput> = z.object({
  identifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VerificationTokenCreateManyInputSchema: z.ZodType<Prisma.VerificationTokenCreateManyInput> = z.object({
  identifier: z.string(),
  token: z.string(),
  expires: z.coerce.date()
}).strict();

export const VerificationTokenUpdateManyMutationInputSchema: z.ZodType<Prisma.VerificationTokenUpdateManyMutationInput> = z.object({
  identifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VerificationTokenUncheckedUpdateManyInputSchema: z.ZodType<Prisma.VerificationTokenUncheckedUpdateManyInput> = z.object({
  identifier: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WorkoutOfMesocycleCreateInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateInput> = z.object({
  id: z.string().cuid().optional(),
  splitDayName: z.string(),
  workoutStatus: z.lazy(() => WorkoutStatusSchema).optional().nullable(),
  workout: z.lazy(() => WorkoutCreateNestedOneWithoutWorkoutOfMesocycleInputSchema),
  mesocycle: z.lazy(() => MesocycleCreateNestedOneWithoutWorkoutsOfMesocycleInputSchema)
}).strict();

export const WorkoutOfMesocycleUncheckedCreateInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  workoutId: z.string(),
  mesocycleId: z.string(),
  splitDayName: z.string(),
  workoutStatus: z.lazy(() => WorkoutStatusSchema).optional().nullable()
}).strict();

export const WorkoutOfMesocycleUpdateInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  splitDayName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutStatus: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  workout: z.lazy(() => WorkoutUpdateOneRequiredWithoutWorkoutOfMesocycleNestedInputSchema).optional(),
  mesocycle: z.lazy(() => MesocycleUpdateOneRequiredWithoutWorkoutsOfMesocycleNestedInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleUncheckedUpdateInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  splitDayName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutStatus: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const WorkoutOfMesocycleCreateManyInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  workoutId: z.string(),
  mesocycleId: z.string(),
  splitDayName: z.string(),
  workoutStatus: z.lazy(() => WorkoutStatusSchema).optional().nullable()
}).strict();

export const WorkoutOfMesocycleUpdateManyMutationInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  splitDayName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutStatus: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const WorkoutOfMesocycleUncheckedUpdateManyInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  splitDayName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutStatus: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const WorkoutCreateInputSchema: z.ZodType<Prisma.WorkoutCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutWorkoutInputSchema),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleCreateNestedOneWithoutWorkoutInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseCreateNestedManyWithoutWorkoutInputSchema).optional()
}).strict();

export const WorkoutUncheckedCreateInputSchema: z.ZodType<Prisma.WorkoutUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  userId: z.string(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedCreateNestedOneWithoutWorkoutInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseUncheckedCreateNestedManyWithoutWorkoutInputSchema).optional()
}).strict();

export const WorkoutUpdateInputSchema: z.ZodType<Prisma.WorkoutUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutWorkoutNestedInputSchema).optional(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleUpdateOneWithoutWorkoutNestedInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseUpdateManyWithoutWorkoutNestedInputSchema).optional()
}).strict();

export const WorkoutUncheckedUpdateInputSchema: z.ZodType<Prisma.WorkoutUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedUpdateOneWithoutWorkoutNestedInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseUncheckedUpdateManyWithoutWorkoutNestedInputSchema).optional()
}).strict();

export const WorkoutCreateManyInputSchema: z.ZodType<Prisma.WorkoutCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  userId: z.string()
}).strict();

export const WorkoutUpdateManyMutationInputSchema: z.ZodType<Prisma.WorkoutUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WorkoutUncheckedUpdateManyInputSchema: z.ZodType<Prisma.WorkoutUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WorkoutExerciseCreateInputSchema: z.ZodType<Prisma.WorkoutExerciseCreateInput> = z.object({
  id: z.string().cuid().optional(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable(),
  minimumWeightChange: z.number().optional().nullable(),
  workout: z.lazy(() => WorkoutCreateNestedOneWithoutWorkoutExercisesInputSchema),
  setData: z.lazy(() => SetsOfWorkoutExerciseCreateNestedOneWithoutWorkoutExerciseInputSchema)
}).strict();

export const WorkoutExerciseUncheckedCreateInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  exerciseIndex: z.number().int(),
  workoutId: z.string(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable(),
  minimumWeightChange: z.number().optional().nullable(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const WorkoutExerciseUpdateInputSchema: z.ZodType<Prisma.WorkoutExerciseUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  minimumWeightChange: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  workout: z.lazy(() => WorkoutUpdateOneRequiredWithoutWorkoutExercisesNestedInputSchema).optional(),
  setData: z.lazy(() => SetsOfWorkoutExerciseUpdateOneRequiredWithoutWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const WorkoutExerciseUncheckedUpdateInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  minimumWeightChange: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WorkoutExerciseCreateManyInputSchema: z.ZodType<Prisma.WorkoutExerciseCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  exerciseIndex: z.number().int(),
  workoutId: z.string(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable(),
  minimumWeightChange: z.number().optional().nullable(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const WorkoutExerciseUpdateManyMutationInputSchema: z.ZodType<Prisma.WorkoutExerciseUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  minimumWeightChange: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const WorkoutExerciseUncheckedUpdateManyInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  minimumWeightChange: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SetsOfWorkoutExerciseCreateInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseCreateNestedOneWithoutSetDataInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedCreateInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedCreateNestedOneWithoutSetDataInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUpdateInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUpdateOneWithoutSetDataNestedInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedUpdateInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedUpdateOneWithoutSetDataNestedInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateManyInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int()
}).strict();

export const SetsOfWorkoutExerciseUpdateManyMutationInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SetsOfWorkoutExerciseUncheckedUpdateManyInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const StraightSetsCreateInputSchema: z.ZodType<Prisma.StraightSetsCreateInput> = z.object({
  id: z.string().cuid().optional(),
  load: z.number().int(),
  repNumbers: z.union([ z.lazy(() => StraightSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseCreateNestedOneWithoutStraightSetsInputSchema)
}).strict();

export const StraightSetsUncheckedCreateInputSchema: z.ZodType<Prisma.StraightSetsUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  load: z.number().int(),
  repNumbers: z.union([ z.lazy(() => StraightSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const StraightSetsUpdateInputSchema: z.ZodType<Prisma.StraightSetsUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  load: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repNumbers: z.union([ z.lazy(() => StraightSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseUpdateOneRequiredWithoutStraightSetsNestedInputSchema).optional()
}).strict();

export const StraightSetsUncheckedUpdateInputSchema: z.ZodType<Prisma.StraightSetsUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  load: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repNumbers: z.union([ z.lazy(() => StraightSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const StraightSetsCreateManyInputSchema: z.ZodType<Prisma.StraightSetsCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  load: z.number().int(),
  repNumbers: z.union([ z.lazy(() => StraightSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const StraightSetsUpdateManyMutationInputSchema: z.ZodType<Prisma.StraightSetsUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  load: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repNumbers: z.union([ z.lazy(() => StraightSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const StraightSetsUncheckedUpdateManyInputSchema: z.ZodType<Prisma.StraightSetsUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  load: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repNumbers: z.union([ z.lazy(() => StraightSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const FixedChangeSetsCreateInputSchema: z.ZodType<Prisma.FixedChangeSetsCreateInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.lazy(() => ChangeTypeSchema),
  changeAmount: z.number(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseCreateNestedOneWithoutFixedChangeSetsInputSchema)
}).strict();

export const FixedChangeSetsUncheckedCreateInputSchema: z.ZodType<Prisma.FixedChangeSetsUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.lazy(() => ChangeTypeSchema),
  changeAmount: z.number(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const FixedChangeSetsUpdateInputSchema: z.ZodType<Prisma.FixedChangeSetsUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => EnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional(),
  changeAmount: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseUpdateOneRequiredWithoutFixedChangeSetsNestedInputSchema).optional()
}).strict();

export const FixedChangeSetsUncheckedUpdateInputSchema: z.ZodType<Prisma.FixedChangeSetsUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => EnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional(),
  changeAmount: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const FixedChangeSetsCreateManyInputSchema: z.ZodType<Prisma.FixedChangeSetsCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.lazy(() => ChangeTypeSchema),
  changeAmount: z.number(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const FixedChangeSetsUpdateManyMutationInputSchema: z.ZodType<Prisma.FixedChangeSetsUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => EnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional(),
  changeAmount: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const FixedChangeSetsUncheckedUpdateManyInputSchema: z.ZodType<Prisma.FixedChangeSetsUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => EnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional(),
  changeAmount: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VariableChangeSetsCreateInputSchema: z.ZodType<Prisma.VariableChangeSetsCreateInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseCreateNestedOneWithoutVariableChangeSetsInputSchema)
}).strict();

export const VariableChangeSetsUncheckedCreateInputSchema: z.ZodType<Prisma.VariableChangeSetsUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const VariableChangeSetsUpdateInputSchema: z.ZodType<Prisma.VariableChangeSetsUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseUpdateOneRequiredWithoutVariableChangeSetsNestedInputSchema).optional()
}).strict();

export const VariableChangeSetsUncheckedUpdateInputSchema: z.ZodType<Prisma.VariableChangeSetsUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VariableChangeSetsCreateManyInputSchema: z.ZodType<Prisma.VariableChangeSetsCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const VariableChangeSetsUpdateManyMutationInputSchema: z.ZodType<Prisma.VariableChangeSetsUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const VariableChangeSetsUncheckedUpdateManyInputSchema: z.ZodType<Prisma.VariableChangeSetsUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MyorepMatchSetsCreateInputSchema: z.ZodType<Prisma.MyorepMatchSetsCreateInput> = z.object({
  id: z.string().cuid().optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetCreateNestedManyWithoutMyorepMatchSetsInputSchema).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseCreateNestedOneWithoutMyorepMatchSetsInputSchema)
}).strict();

export const MyorepMatchSetsUncheckedCreateInputSchema: z.ZodType<Prisma.MyorepMatchSetsUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  setsOfWorkoutExerciseId: z.string(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetUncheckedCreateNestedManyWithoutMyorepMatchSetsInputSchema).optional()
}).strict();

export const MyorepMatchSetsUpdateInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetUpdateManyWithoutMyorepMatchSetsNestedInputSchema).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseUpdateOneRequiredWithoutMyorepMatchSetsNestedInputSchema).optional()
}).strict();

export const MyorepMatchSetsUncheckedUpdateInputSchema: z.ZodType<Prisma.MyorepMatchSetsUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetUncheckedUpdateManyWithoutMyorepMatchSetsNestedInputSchema).optional()
}).strict();

export const MyorepMatchSetsCreateManyInputSchema: z.ZodType<Prisma.MyorepMatchSetsCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const MyorepMatchSetsUpdateManyMutationInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MyorepMatchSetsUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MyorepMatchSetsUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MyorepMatchSetCreateInputSchema: z.ZodType<Prisma.MyorepMatchSetCreateInput> = z.object({
  id: z.string().cuid().optional(),
  repNumber: z.number().int(),
  loadNumber: z.number().int(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetCreatemyorepsInputSchema),z.number().int().array() ]).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsCreateNestedOneWithoutMyorepMatchSetsInputSchema).optional()
}).strict();

export const MyorepMatchSetUncheckedCreateInputSchema: z.ZodType<Prisma.MyorepMatchSetUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  repNumber: z.number().int(),
  loadNumber: z.number().int(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetCreatemyorepsInputSchema),z.number().int().array() ]).optional(),
  myorepMatchSetsId: z.string().optional().nullable()
}).strict();

export const MyorepMatchSetUpdateInputSchema: z.ZodType<Prisma.MyorepMatchSetUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  repNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetUpdatemyorepsInputSchema),z.number().int().array() ]).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUpdateOneWithoutMyorepMatchSetsNestedInputSchema).optional()
}).strict();

export const MyorepMatchSetUncheckedUpdateInputSchema: z.ZodType<Prisma.MyorepMatchSetUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  repNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetUpdatemyorepsInputSchema),z.number().int().array() ]).optional(),
  myorepMatchSetsId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const MyorepMatchSetCreateManyInputSchema: z.ZodType<Prisma.MyorepMatchSetCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  repNumber: z.number().int(),
  loadNumber: z.number().int(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetCreatemyorepsInputSchema),z.number().int().array() ]).optional(),
  myorepMatchSetsId: z.string().optional().nullable()
}).strict();

export const MyorepMatchSetUpdateManyMutationInputSchema: z.ZodType<Prisma.MyorepMatchSetUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  repNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetUpdatemyorepsInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const MyorepMatchSetUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MyorepMatchSetUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  repNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetUpdatemyorepsInputSchema),z.number().int().array() ]).optional(),
  myorepMatchSetsId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const StringFilterSchema: z.ZodType<Prisma.StringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const UserRelationFilterSchema: z.ZodType<Prisma.UserRelationFilter> = z.object({
  is: z.lazy(() => UserWhereInputSchema).optional(),
  isNot: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const ExerciseSplitDayListRelationFilterSchema: z.ZodType<Prisma.ExerciseSplitDayListRelationFilter> = z.object({
  every: z.lazy(() => ExerciseSplitDayWhereInputSchema).optional(),
  some: z.lazy(() => ExerciseSplitDayWhereInputSchema).optional(),
  none: z.lazy(() => ExerciseSplitDayWhereInputSchema).optional()
}).strict();

export const MesocycleListRelationFilterSchema: z.ZodType<Prisma.MesocycleListRelationFilter> = z.object({
  every: z.lazy(() => MesocycleWhereInputSchema).optional(),
  some: z.lazy(() => MesocycleWhereInputSchema).optional(),
  none: z.lazy(() => MesocycleWhereInputSchema).optional()
}).strict();

export const ExerciseSplitDayOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitDayOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleOrderByRelationAggregateInputSchema: z.ZodType<Prisma.MesocycleOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseSplitCountOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseSplitMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseSplitMinOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StringWithAggregatesFilterSchema: z.ZodType<Prisma.StringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional()
}).strict();

export const IntFilterSchema: z.ZodType<Prisma.IntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

export const BoolFilterSchema: z.ZodType<Prisma.BoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const ExerciseTemplateListRelationFilterSchema: z.ZodType<Prisma.ExerciseTemplateListRelationFilter> = z.object({
  every: z.lazy(() => ExerciseTemplateWhereInputSchema).optional(),
  some: z.lazy(() => ExerciseTemplateWhereInputSchema).optional(),
  none: z.lazy(() => ExerciseTemplateWhereInputSchema).optional()
}).strict();

export const ExerciseSplitRelationFilterSchema: z.ZodType<Prisma.ExerciseSplitRelationFilter> = z.object({
  is: z.lazy(() => ExerciseSplitWhereInputSchema).optional(),
  isNot: z.lazy(() => ExerciseSplitWhereInputSchema).optional()
}).strict();

export const ExerciseTemplateOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ExerciseTemplateOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseSplitDayCountOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitDayCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseSplitDayAvgOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitDayAvgOrderByAggregateInput> = z.object({
  dayIndex: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseSplitDayMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitDayMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseSplitDayMinOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitDayMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseSplitDaySumOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitDaySumOrderByAggregateInput> = z.object({
  dayIndex: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const IntWithAggregatesFilterSchema: z.ZodType<Prisma.IntWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedIntFilterSchema).optional(),
  _max: z.lazy(() => NestedIntFilterSchema).optional()
}).strict();

export const BoolWithAggregatesFilterSchema: z.ZodType<Prisma.BoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional()
}).strict();

export const EnumMuscleGroupFilterSchema: z.ZodType<Prisma.EnumMuscleGroupFilter> = z.object({
  equals: z.lazy(() => MuscleGroupSchema).optional(),
  in: z.lazy(() => MuscleGroupSchema).array().optional(),
  notIn: z.lazy(() => MuscleGroupSchema).array().optional(),
  not: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => NestedEnumMuscleGroupFilterSchema) ]).optional(),
}).strict();

export const StringNullableFilterSchema: z.ZodType<Prisma.StringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const EnumSetTypeFilterSchema: z.ZodType<Prisma.EnumSetTypeFilter> = z.object({
  equals: z.lazy(() => SetTypeSchema).optional(),
  in: z.lazy(() => SetTypeSchema).array().optional(),
  notIn: z.lazy(() => SetTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => NestedEnumSetTypeFilterSchema) ]).optional(),
}).strict();

export const EnumChangeTypeNullableFilterSchema: z.ZodType<Prisma.EnumChangeTypeNullableFilter> = z.object({
  equals: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  in: z.lazy(() => ChangeTypeSchema).array().optional().nullable(),
  notIn: z.lazy(() => ChangeTypeSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NestedEnumChangeTypeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const FloatNullableFilterSchema: z.ZodType<Prisma.FloatNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const ExerciseSplitDayRelationFilterSchema: z.ZodType<Prisma.ExerciseSplitDayRelationFilter> = z.object({
  is: z.lazy(() => ExerciseSplitDayWhereInputSchema).optional(),
  isNot: z.lazy(() => ExerciseSplitDayWhereInputSchema).optional()
}).strict();

export const SortOrderInputSchema: z.ZodType<Prisma.SortOrderInput> = z.object({
  sort: z.lazy(() => SortOrderSchema),
  nulls: z.lazy(() => NullsOrderSchema).optional()
}).strict();

export const ExerciseTemplateCountOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseTemplateCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  note: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitDayId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseTemplateAvgOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseTemplateAvgOrderByAggregateInput> = z.object({
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseTemplateMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseTemplateMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  note: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitDayId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseTemplateMinOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseTemplateMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  note: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitDayId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseTemplateSumOrderByAggregateInputSchema: z.ZodType<Prisma.ExerciseTemplateSumOrderByAggregateInput> = z.object({
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumMuscleGroupWithAggregatesFilterSchema: z.ZodType<Prisma.EnumMuscleGroupWithAggregatesFilter> = z.object({
  equals: z.lazy(() => MuscleGroupSchema).optional(),
  in: z.lazy(() => MuscleGroupSchema).array().optional(),
  notIn: z.lazy(() => MuscleGroupSchema).array().optional(),
  not: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => NestedEnumMuscleGroupWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumMuscleGroupFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumMuscleGroupFilterSchema).optional()
}).strict();

export const StringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.StringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional()
}).strict();

export const EnumSetTypeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumSetTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => SetTypeSchema).optional(),
  in: z.lazy(() => SetTypeSchema).array().optional(),
  notIn: z.lazy(() => SetTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => NestedEnumSetTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumSetTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumSetTypeFilterSchema).optional()
}).strict();

export const EnumChangeTypeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.EnumChangeTypeNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  in: z.lazy(() => ChangeTypeSchema).array().optional().nullable(),
  notIn: z.lazy(() => ChangeTypeSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NestedEnumChangeTypeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumChangeTypeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumChangeTypeNullableFilterSchema).optional()
}).strict();

export const FloatNullableWithAggregatesFilterSchema: z.ZodType<Prisma.FloatNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatNullableFilterSchema).optional()
}).strict();

export const IntNullableListFilterSchema: z.ZodType<Prisma.IntNullableListFilter> = z.object({
  equals: z.number().array().optional().nullable(),
  has: z.number().optional().nullable(),
  hasEvery: z.number().array().optional(),
  hasSome: z.number().array().optional(),
  isEmpty: z.boolean().optional()
}).strict();

export const DateTimeNullableFilterSchema: z.ZodType<Prisma.DateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const EnumProgressionVariableFilterSchema: z.ZodType<Prisma.EnumProgressionVariableFilter> = z.object({
  equals: z.lazy(() => ProgressionVariableSchema).optional(),
  in: z.lazy(() => ProgressionVariableSchema).array().optional(),
  notIn: z.lazy(() => ProgressionVariableSchema).array().optional(),
  not: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NestedEnumProgressionVariableFilterSchema) ]).optional(),
}).strict();

export const FloatFilterSchema: z.ZodType<Prisma.FloatFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatFilterSchema) ]).optional(),
}).strict();

export const ExerciseSplitNullableRelationFilterSchema: z.ZodType<Prisma.ExerciseSplitNullableRelationFilter> = z.object({
  is: z.lazy(() => ExerciseSplitWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => ExerciseSplitWhereInputSchema).optional().nullable()
}).strict();

export const MesocycleExerciseSplitDayListRelationFilterSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayListRelationFilter> = z.object({
  every: z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).optional(),
  some: z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).optional(),
  none: z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeListRelationFilterSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeListRelationFilter> = z.object({
  every: z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema).optional(),
  some: z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema).optional(),
  none: z.lazy(() => MesocycleCyclicSetChangeWhereInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleListRelationFilterSchema: z.ZodType<Prisma.WorkoutOfMesocycleListRelationFilter> = z.object({
  every: z.lazy(() => WorkoutOfMesocycleWhereInputSchema).optional(),
  some: z.lazy(() => WorkoutOfMesocycleWhereInputSchema).optional(),
  none: z.lazy(() => WorkoutOfMesocycleWhereInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayOrderByRelationAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeOrderByRelationAggregateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutOfMesocycleOrderByRelationAggregateInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleCountOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.lazy(() => SortOrderSchema).optional(),
  RIRProgression: z.lazy(() => SortOrderSchema).optional(),
  startDate: z.lazy(() => SortOrderSchema).optional(),
  endDate: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  startOverloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleAvgOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleAvgOrderByAggregateInput> = z.object({
  RIRProgression: z.lazy(() => SortOrderSchema).optional(),
  startOverloadPercentage: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.lazy(() => SortOrderSchema).optional(),
  startDate: z.lazy(() => SortOrderSchema).optional(),
  endDate: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  startOverloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleMinOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  exerciseSplitId: z.lazy(() => SortOrderSchema).optional(),
  startDate: z.lazy(() => SortOrderSchema).optional(),
  endDate: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  startOverloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleSumOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleSumOrderByAggregateInput> = z.object({
  RIRProgression: z.lazy(() => SortOrderSchema).optional(),
  startOverloadPercentage: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional()
}).strict();

export const EnumProgressionVariableWithAggregatesFilterSchema: z.ZodType<Prisma.EnumProgressionVariableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ProgressionVariableSchema).optional(),
  in: z.lazy(() => ProgressionVariableSchema).array().optional(),
  notIn: z.lazy(() => ProgressionVariableSchema).array().optional(),
  not: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NestedEnumProgressionVariableWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumProgressionVariableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumProgressionVariableFilterSchema).optional()
}).strict();

export const FloatWithAggregatesFilterSchema: z.ZodType<Prisma.FloatWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatFilterSchema).optional()
}).strict();

export const MesocycleRelationFilterSchema: z.ZodType<Prisma.MesocycleRelationFilter> = z.object({
  is: z.lazy(() => MesocycleWhereInputSchema).optional(),
  isNot: z.lazy(() => MesocycleWhereInputSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeCountOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  muscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  regardlessOfProgress: z.lazy(() => SortOrderSchema).optional(),
  setIncreaseAmount: z.lazy(() => SortOrderSchema).optional(),
  maxVolume: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeAvgOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeAvgOrderByAggregateInput> = z.object({
  setIncreaseAmount: z.lazy(() => SortOrderSchema).optional(),
  maxVolume: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  muscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  regardlessOfProgress: z.lazy(() => SortOrderSchema).optional(),
  setIncreaseAmount: z.lazy(() => SortOrderSchema).optional(),
  maxVolume: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeMinOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  muscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  regardlessOfProgress: z.lazy(() => SortOrderSchema).optional(),
  setIncreaseAmount: z.lazy(() => SortOrderSchema).optional(),
  maxVolume: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleCyclicSetChangeSumOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeSumOrderByAggregateInput> = z.object({
  setIncreaseAmount: z.lazy(() => SortOrderSchema).optional(),
  maxVolume: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseTemplateListRelationFilterSchema: z.ZodType<Prisma.MesocycleExerciseTemplateListRelationFilter> = z.object({
  every: z.lazy(() => MesocycleExerciseTemplateWhereInputSchema).optional(),
  some: z.lazy(() => MesocycleExerciseTemplateWhereInputSchema).optional(),
  none: z.lazy(() => MesocycleExerciseTemplateWhereInputSchema).optional()
}).strict();

export const MesocycleExerciseTemplateOrderByRelationAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayCountOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayAvgOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayAvgOrderByAggregateInput> = z.object({
  dayIndex: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayMinOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  dayIndex: z.lazy(() => SortOrderSchema).optional(),
  isRestDay: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseSplitDaySumOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDaySumOrderByAggregateInput> = z.object({
  dayIndex: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumProgressionVariableNullableFilterSchema: z.ZodType<Prisma.EnumProgressionVariableNullableFilter> = z.object({
  equals: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  in: z.lazy(() => ProgressionVariableSchema).array().optional().nullable(),
  notIn: z.lazy(() => ProgressionVariableSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NestedEnumProgressionVariableNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const BoolNullableFilterSchema: z.ZodType<Prisma.BoolNullableFilter> = z.object({
  equals: z.boolean().optional().nullable(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const MesocycleExerciseSplitDayRelationFilterSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayRelationFilter> = z.object({
  is: z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).optional(),
  isNot: z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).optional()
}).strict();

export const MesocycleExerciseTemplateCountOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  sets: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  note: z.lazy(() => SortOrderSchema).optional(),
  mesocycleExerciseSplitDayId: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseTemplateAvgOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateAvgOrderByAggregateInput> = z.object({
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  sets: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseTemplateMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  sets: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  note: z.lazy(() => SortOrderSchema).optional(),
  mesocycleExerciseSplitDayId: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseTemplateMinOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  sets: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  note: z.lazy(() => SortOrderSchema).optional(),
  mesocycleExerciseSplitDayId: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MesocycleExerciseTemplateSumOrderByAggregateInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateSumOrderByAggregateInput> = z.object({
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  sets: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumProgressionVariableNullableWithAggregatesFilterSchema: z.ZodType<Prisma.EnumProgressionVariableNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  in: z.lazy(() => ProgressionVariableSchema).array().optional().nullable(),
  notIn: z.lazy(() => ProgressionVariableSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NestedEnumProgressionVariableNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumProgressionVariableNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumProgressionVariableNullableFilterSchema).optional()
}).strict();

export const BoolNullableWithAggregatesFilterSchema: z.ZodType<Prisma.BoolNullableWithAggregatesFilter> = z.object({
  equals: z.boolean().optional().nullable(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolNullableFilterSchema).optional()
}).strict();

export const DateTimeFilterSchema: z.ZodType<Prisma.DateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const AccountListRelationFilterSchema: z.ZodType<Prisma.AccountListRelationFilter> = z.object({
  every: z.lazy(() => AccountWhereInputSchema).optional(),
  some: z.lazy(() => AccountWhereInputSchema).optional(),
  none: z.lazy(() => AccountWhereInputSchema).optional()
}).strict();

export const SessionListRelationFilterSchema: z.ZodType<Prisma.SessionListRelationFilter> = z.object({
  every: z.lazy(() => SessionWhereInputSchema).optional(),
  some: z.lazy(() => SessionWhereInputSchema).optional(),
  none: z.lazy(() => SessionWhereInputSchema).optional()
}).strict();

export const ExerciseSplitListRelationFilterSchema: z.ZodType<Prisma.ExerciseSplitListRelationFilter> = z.object({
  every: z.lazy(() => ExerciseSplitWhereInputSchema).optional(),
  some: z.lazy(() => ExerciseSplitWhereInputSchema).optional(),
  none: z.lazy(() => ExerciseSplitWhereInputSchema).optional()
}).strict();

export const WorkoutListRelationFilterSchema: z.ZodType<Prisma.WorkoutListRelationFilter> = z.object({
  every: z.lazy(() => WorkoutWhereInputSchema).optional(),
  some: z.lazy(() => WorkoutWhereInputSchema).optional(),
  none: z.lazy(() => WorkoutWhereInputSchema).optional()
}).strict();

export const AccountOrderByRelationAggregateInputSchema: z.ZodType<Prisma.AccountOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SessionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.SessionOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExerciseSplitOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ExerciseSplitOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutOrderByRelationAggregateInputSchema: z.ZodType<Prisma.WorkoutOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserCountOrderByAggregateInputSchema: z.ZodType<Prisma.UserCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  image: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserMaxOrderByAggregateInputSchema: z.ZodType<Prisma.UserMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  image: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserMinOrderByAggregateInputSchema: z.ZodType<Prisma.UserMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  emailVerified: z.lazy(() => SortOrderSchema).optional(),
  image: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional()
}).strict();

export const IntNullableFilterSchema: z.ZodType<Prisma.IntNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const AccountProviderProviderAccountIdCompoundUniqueInputSchema: z.ZodType<Prisma.AccountProviderProviderAccountIdCompoundUniqueInput> = z.object({
  provider: z.string(),
  providerAccountId: z.string()
}).strict();

export const AccountCountOrderByAggregateInputSchema: z.ZodType<Prisma.AccountCountOrderByAggregateInput> = z.object({
  userId: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  provider: z.lazy(() => SortOrderSchema).optional(),
  providerAccountId: z.lazy(() => SortOrderSchema).optional(),
  refresh_token: z.lazy(() => SortOrderSchema).optional(),
  access_token: z.lazy(() => SortOrderSchema).optional(),
  expires_at: z.lazy(() => SortOrderSchema).optional(),
  token_type: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  id_token: z.lazy(() => SortOrderSchema).optional(),
  session_state: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AccountAvgOrderByAggregateInputSchema: z.ZodType<Prisma.AccountAvgOrderByAggregateInput> = z.object({
  expires_at: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AccountMaxOrderByAggregateInputSchema: z.ZodType<Prisma.AccountMaxOrderByAggregateInput> = z.object({
  userId: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  provider: z.lazy(() => SortOrderSchema).optional(),
  providerAccountId: z.lazy(() => SortOrderSchema).optional(),
  refresh_token: z.lazy(() => SortOrderSchema).optional(),
  access_token: z.lazy(() => SortOrderSchema).optional(),
  expires_at: z.lazy(() => SortOrderSchema).optional(),
  token_type: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  id_token: z.lazy(() => SortOrderSchema).optional(),
  session_state: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AccountMinOrderByAggregateInputSchema: z.ZodType<Prisma.AccountMinOrderByAggregateInput> = z.object({
  userId: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  provider: z.lazy(() => SortOrderSchema).optional(),
  providerAccountId: z.lazy(() => SortOrderSchema).optional(),
  refresh_token: z.lazy(() => SortOrderSchema).optional(),
  access_token: z.lazy(() => SortOrderSchema).optional(),
  expires_at: z.lazy(() => SortOrderSchema).optional(),
  token_type: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  id_token: z.lazy(() => SortOrderSchema).optional(),
  session_state: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const AccountSumOrderByAggregateInputSchema: z.ZodType<Prisma.AccountSumOrderByAggregateInput> = z.object({
  expires_at: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const IntNullableWithAggregatesFilterSchema: z.ZodType<Prisma.IntNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional()
}).strict();

export const SessionCountOrderByAggregateInputSchema: z.ZodType<Prisma.SessionCountOrderByAggregateInput> = z.object({
  sessionToken: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SessionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.SessionMaxOrderByAggregateInput> = z.object({
  sessionToken: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SessionMinOrderByAggregateInputSchema: z.ZodType<Prisma.SessionMinOrderByAggregateInput> = z.object({
  sessionToken: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const VerificationTokenIdentifierTokenCompoundUniqueInputSchema: z.ZodType<Prisma.VerificationTokenIdentifierTokenCompoundUniqueInput> = z.object({
  identifier: z.string(),
  token: z.string()
}).strict();

export const VerificationTokenCountOrderByAggregateInputSchema: z.ZodType<Prisma.VerificationTokenCountOrderByAggregateInput> = z.object({
  identifier: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const VerificationTokenMaxOrderByAggregateInputSchema: z.ZodType<Prisma.VerificationTokenMaxOrderByAggregateInput> = z.object({
  identifier: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const VerificationTokenMinOrderByAggregateInputSchema: z.ZodType<Prisma.VerificationTokenMinOrderByAggregateInput> = z.object({
  identifier: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumWorkoutStatusNullableFilterSchema: z.ZodType<Prisma.EnumWorkoutStatusNullableFilter> = z.object({
  equals: z.lazy(() => WorkoutStatusSchema).optional().nullable(),
  in: z.lazy(() => WorkoutStatusSchema).array().optional().nullable(),
  notIn: z.lazy(() => WorkoutStatusSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NestedEnumWorkoutStatusNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const WorkoutRelationFilterSchema: z.ZodType<Prisma.WorkoutRelationFilter> = z.object({
  is: z.lazy(() => WorkoutWhereInputSchema).optional(),
  isNot: z.lazy(() => WorkoutWhereInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleCountOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  splitDayName: z.lazy(() => SortOrderSchema).optional(),
  workoutStatus: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutOfMesocycleMaxOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  splitDayName: z.lazy(() => SortOrderSchema).optional(),
  workoutStatus: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutOfMesocycleMinOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  mesocycleId: z.lazy(() => SortOrderSchema).optional(),
  splitDayName: z.lazy(() => SortOrderSchema).optional(),
  workoutStatus: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumWorkoutStatusNullableWithAggregatesFilterSchema: z.ZodType<Prisma.EnumWorkoutStatusNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => WorkoutStatusSchema).optional().nullable(),
  in: z.lazy(() => WorkoutStatusSchema).array().optional().nullable(),
  notIn: z.lazy(() => WorkoutStatusSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NestedEnumWorkoutStatusNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumWorkoutStatusNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumWorkoutStatusNullableFilterSchema).optional()
}).strict();

export const WorkoutOfMesocycleNullableRelationFilterSchema: z.ZodType<Prisma.WorkoutOfMesocycleNullableRelationFilter> = z.object({
  is: z.lazy(() => WorkoutOfMesocycleWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => WorkoutOfMesocycleWhereInputSchema).optional().nullable()
}).strict();

export const WorkoutExerciseListRelationFilterSchema: z.ZodType<Prisma.WorkoutExerciseListRelationFilter> = z.object({
  every: z.lazy(() => WorkoutExerciseWhereInputSchema).optional(),
  some: z.lazy(() => WorkoutExerciseWhereInputSchema).optional(),
  none: z.lazy(() => WorkoutExerciseWhereInputSchema).optional()
}).strict();

export const WorkoutExerciseOrderByRelationAggregateInputSchema: z.ZodType<Prisma.WorkoutExerciseOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutCountOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutMaxOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutMinOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseRelationFilterSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseRelationFilter> = z.object({
  is: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional(),
  isNot: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional()
}).strict();

export const WorkoutExerciseCountOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutExerciseCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  note: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional(),
  minimumWeightChange: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutExerciseAvgOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutExerciseAvgOrderByAggregateInput> = z.object({
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  minimumWeightChange: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutExerciseMaxOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutExerciseMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  note: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional(),
  minimumWeightChange: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutExerciseMinOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutExerciseMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  workoutId: z.lazy(() => SortOrderSchema).optional(),
  targetMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  customMuscleGroup: z.lazy(() => SortOrderSchema).optional(),
  involvesBodyweight: z.lazy(() => SortOrderSchema).optional(),
  note: z.lazy(() => SortOrderSchema).optional(),
  preferredProgressionVariable: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  lastSetToFailure: z.lazy(() => SortOrderSchema).optional(),
  forceRIRMatching: z.lazy(() => SortOrderSchema).optional(),
  minimumWeightChange: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutExerciseSumOrderByAggregateInputSchema: z.ZodType<Prisma.WorkoutExerciseSumOrderByAggregateInput> = z.object({
  exerciseIndex: z.lazy(() => SortOrderSchema).optional(),
  overloadPercentage: z.lazy(() => SortOrderSchema).optional(),
  minimumWeightChange: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WorkoutExerciseNullableRelationFilterSchema: z.ZodType<Prisma.WorkoutExerciseNullableRelationFilter> = z.object({
  is: z.lazy(() => WorkoutExerciseWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => WorkoutExerciseWhereInputSchema).optional().nullable()
}).strict();

export const StraightSetsNullableRelationFilterSchema: z.ZodType<Prisma.StraightSetsNullableRelationFilter> = z.object({
  is: z.lazy(() => StraightSetsWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => StraightSetsWhereInputSchema).optional().nullable()
}).strict();

export const FixedChangeSetsNullableRelationFilterSchema: z.ZodType<Prisma.FixedChangeSetsNullableRelationFilter> = z.object({
  is: z.lazy(() => FixedChangeSetsWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => FixedChangeSetsWhereInputSchema).optional().nullable()
}).strict();

export const VariableChangeSetsNullableRelationFilterSchema: z.ZodType<Prisma.VariableChangeSetsNullableRelationFilter> = z.object({
  is: z.lazy(() => VariableChangeSetsWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => VariableChangeSetsWhereInputSchema).optional().nullable()
}).strict();

export const MyorepMatchSetsNullableRelationFilterSchema: z.ZodType<Prisma.MyorepMatchSetsNullableRelationFilter> = z.object({
  is: z.lazy(() => MyorepMatchSetsWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => MyorepMatchSetsWhereInputSchema).optional().nullable()
}).strict();

export const SetsOfWorkoutExerciseCountOrderByAggregateInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseAvgOrderByAggregateInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseAvgOrderByAggregateInput> = z.object({
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseMaxOrderByAggregateInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseMinOrderByAggregateInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setType: z.lazy(() => SortOrderSchema).optional(),
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseSumOrderByAggregateInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseSumOrderByAggregateInput> = z.object({
  repRangeStart: z.lazy(() => SortOrderSchema).optional(),
  repRangeEnd: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StraightSetsCountOrderByAggregateInputSchema: z.ZodType<Prisma.StraightSetsCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  load: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StraightSetsAvgOrderByAggregateInputSchema: z.ZodType<Prisma.StraightSetsAvgOrderByAggregateInput> = z.object({
  load: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StraightSetsMaxOrderByAggregateInputSchema: z.ZodType<Prisma.StraightSetsMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  load: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StraightSetsMinOrderByAggregateInputSchema: z.ZodType<Prisma.StraightSetsMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  load: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StraightSetsSumOrderByAggregateInputSchema: z.ZodType<Prisma.StraightSetsSumOrderByAggregateInput> = z.object({
  load: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumChangeTypeFilterSchema: z.ZodType<Prisma.EnumChangeTypeFilter> = z.object({
  equals: z.lazy(() => ChangeTypeSchema).optional(),
  in: z.lazy(() => ChangeTypeSchema).array().optional(),
  notIn: z.lazy(() => ChangeTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NestedEnumChangeTypeFilterSchema) ]).optional(),
}).strict();

export const FixedChangeSetsCountOrderByAggregateInputSchema: z.ZodType<Prisma.FixedChangeSetsCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const FixedChangeSetsAvgOrderByAggregateInputSchema: z.ZodType<Prisma.FixedChangeSetsAvgOrderByAggregateInput> = z.object({
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const FixedChangeSetsMaxOrderByAggregateInputSchema: z.ZodType<Prisma.FixedChangeSetsMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const FixedChangeSetsMinOrderByAggregateInputSchema: z.ZodType<Prisma.FixedChangeSetsMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  changeType: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const FixedChangeSetsSumOrderByAggregateInputSchema: z.ZodType<Prisma.FixedChangeSetsSumOrderByAggregateInput> = z.object({
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  changeAmount: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumChangeTypeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumChangeTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ChangeTypeSchema).optional(),
  in: z.lazy(() => ChangeTypeSchema).array().optional(),
  notIn: z.lazy(() => ChangeTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NestedEnumChangeTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumChangeTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumChangeTypeFilterSchema).optional()
}).strict();

export const VariableChangeSetsCountOrderByAggregateInputSchema: z.ZodType<Prisma.VariableChangeSetsCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const VariableChangeSetsAvgOrderByAggregateInputSchema: z.ZodType<Prisma.VariableChangeSetsAvgOrderByAggregateInput> = z.object({
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const VariableChangeSetsMaxOrderByAggregateInputSchema: z.ZodType<Prisma.VariableChangeSetsMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const VariableChangeSetsMinOrderByAggregateInputSchema: z.ZodType<Prisma.VariableChangeSetsMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const VariableChangeSetsSumOrderByAggregateInputSchema: z.ZodType<Prisma.VariableChangeSetsSumOrderByAggregateInput> = z.object({
  loadNumbers: z.lazy(() => SortOrderSchema).optional(),
  repNumbers: z.lazy(() => SortOrderSchema).optional(),
  RIRNumbers: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MyorepMatchSetListRelationFilterSchema: z.ZodType<Prisma.MyorepMatchSetListRelationFilter> = z.object({
  every: z.lazy(() => MyorepMatchSetWhereInputSchema).optional(),
  some: z.lazy(() => MyorepMatchSetWhereInputSchema).optional(),
  none: z.lazy(() => MyorepMatchSetWhereInputSchema).optional()
}).strict();

export const MyorepMatchSetOrderByRelationAggregateInputSchema: z.ZodType<Prisma.MyorepMatchSetOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MyorepMatchSetsCountOrderByAggregateInputSchema: z.ZodType<Prisma.MyorepMatchSetsCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MyorepMatchSetsMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MyorepMatchSetsMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MyorepMatchSetsMinOrderByAggregateInputSchema: z.ZodType<Prisma.MyorepMatchSetsMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  setsOfWorkoutExerciseId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MyorepMatchSetCountOrderByAggregateInputSchema: z.ZodType<Prisma.MyorepMatchSetCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  repNumber: z.lazy(() => SortOrderSchema).optional(),
  loadNumber: z.lazy(() => SortOrderSchema).optional(),
  myoreps: z.lazy(() => SortOrderSchema).optional(),
  myorepMatchSetsId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MyorepMatchSetAvgOrderByAggregateInputSchema: z.ZodType<Prisma.MyorepMatchSetAvgOrderByAggregateInput> = z.object({
  repNumber: z.lazy(() => SortOrderSchema).optional(),
  loadNumber: z.lazy(() => SortOrderSchema).optional(),
  myoreps: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MyorepMatchSetMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MyorepMatchSetMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  repNumber: z.lazy(() => SortOrderSchema).optional(),
  loadNumber: z.lazy(() => SortOrderSchema).optional(),
  myorepMatchSetsId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MyorepMatchSetMinOrderByAggregateInputSchema: z.ZodType<Prisma.MyorepMatchSetMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  repNumber: z.lazy(() => SortOrderSchema).optional(),
  loadNumber: z.lazy(() => SortOrderSchema).optional(),
  myorepMatchSetsId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MyorepMatchSetSumOrderByAggregateInputSchema: z.ZodType<Prisma.MyorepMatchSetSumOrderByAggregateInput> = z.object({
  repNumber: z.lazy(() => SortOrderSchema).optional(),
  loadNumber: z.lazy(() => SortOrderSchema).optional(),
  myoreps: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserCreateNestedOneWithoutExerciseSplitsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutExerciseSplitsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutExerciseSplitsInputSchema),z.lazy(() => UserUncheckedCreateWithoutExerciseSplitsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutExerciseSplitsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const ExerciseSplitDayCreateNestedManyWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayCreateNestedManyWithoutExerciseSplitInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema).array(),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseSplitDayCreateManyExerciseSplitInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleCreateNestedManyWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleCreateNestedManyWithoutExerciseSplitInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema).array(),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCreateOrConnectWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleCreateOrConnectWithoutExerciseSplitInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCreateManyExerciseSplitInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ExerciseSplitDayUncheckedCreateNestedManyWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedCreateNestedManyWithoutExerciseSplitInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema).array(),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseSplitDayCreateManyExerciseSplitInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleUncheckedCreateNestedManyWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleUncheckedCreateNestedManyWithoutExerciseSplitInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema).array(),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCreateOrConnectWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleCreateOrConnectWithoutExerciseSplitInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCreateManyExerciseSplitInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const StringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional()
}).strict();

export const UserUpdateOneRequiredWithoutExerciseSplitsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutExerciseSplitsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutExerciseSplitsInputSchema),z.lazy(() => UserUncheckedCreateWithoutExerciseSplitsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutExerciseSplitsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutExerciseSplitsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutExerciseSplitsInputSchema),z.lazy(() => UserUpdateWithoutExerciseSplitsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutExerciseSplitsInputSchema) ]).optional(),
}).strict();

export const ExerciseSplitDayUpdateManyWithoutExerciseSplitNestedInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateManyWithoutExerciseSplitNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema).array(),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ExerciseSplitDayUpsertWithWhereUniqueWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUpsertWithWhereUniqueWithoutExerciseSplitInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseSplitDayCreateManyExerciseSplitInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ExerciseSplitDayUpdateWithWhereUniqueWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUpdateWithWhereUniqueWithoutExerciseSplitInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ExerciseSplitDayUpdateManyWithWhereWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUpdateManyWithWhereWithoutExerciseSplitInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ExerciseSplitDayScalarWhereInputSchema),z.lazy(() => ExerciseSplitDayScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleUpdateManyWithoutExerciseSplitNestedInputSchema: z.ZodType<Prisma.MesocycleUpdateManyWithoutExerciseSplitNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema).array(),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCreateOrConnectWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleCreateOrConnectWithoutExerciseSplitInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleUpsertWithWhereUniqueWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUpsertWithWhereUniqueWithoutExerciseSplitInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCreateManyExerciseSplitInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleUpdateWithWhereUniqueWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUpdateWithWhereUniqueWithoutExerciseSplitInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleUpdateManyWithWhereWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUpdateManyWithWhereWithoutExerciseSplitInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleScalarWhereInputSchema),z.lazy(() => MesocycleScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ExerciseSplitDayUncheckedUpdateManyWithoutExerciseSplitNestedInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedUpdateManyWithoutExerciseSplitNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema).array(),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ExerciseSplitDayUpsertWithWhereUniqueWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUpsertWithWhereUniqueWithoutExerciseSplitInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseSplitDayCreateManyExerciseSplitInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ExerciseSplitDayUpdateWithWhereUniqueWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUpdateWithWhereUniqueWithoutExerciseSplitInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ExerciseSplitDayUpdateManyWithWhereWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUpdateManyWithWhereWithoutExerciseSplitInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ExerciseSplitDayScalarWhereInputSchema),z.lazy(() => ExerciseSplitDayScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleUncheckedUpdateManyWithoutExerciseSplitNestedInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateManyWithoutExerciseSplitNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema).array(),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCreateOrConnectWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleCreateOrConnectWithoutExerciseSplitInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleUpsertWithWhereUniqueWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUpsertWithWhereUniqueWithoutExerciseSplitInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCreateManyExerciseSplitInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleUpdateWithWhereUniqueWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUpdateWithWhereUniqueWithoutExerciseSplitInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleUpdateManyWithWhereWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUpdateManyWithWhereWithoutExerciseSplitInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleScalarWhereInputSchema),z.lazy(() => MesocycleScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ExerciseTemplateCreateNestedManyWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateCreateNestedManyWithoutExerciseSplitDayInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema).array(),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseTemplateCreateManyExerciseSplitDayInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ExerciseSplitCreateNestedOneWithoutExerciseSplitDaysInputSchema: z.ZodType<Prisma.ExerciseSplitCreateNestedOneWithoutExerciseSplitDaysInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutExerciseSplitDaysInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutExerciseSplitDaysInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExerciseSplitCreateOrConnectWithoutExerciseSplitDaysInputSchema).optional(),
  connect: z.lazy(() => ExerciseSplitWhereUniqueInputSchema).optional()
}).strict();

export const ExerciseTemplateUncheckedCreateNestedManyWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateUncheckedCreateNestedManyWithoutExerciseSplitDayInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema).array(),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseTemplateCreateManyExerciseSplitDayInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const IntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.IntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const BoolFieldUpdateOperationsInputSchema: z.ZodType<Prisma.BoolFieldUpdateOperationsInput> = z.object({
  set: z.boolean().optional()
}).strict();

export const ExerciseTemplateUpdateManyWithoutExerciseSplitDayNestedInputSchema: z.ZodType<Prisma.ExerciseTemplateUpdateManyWithoutExerciseSplitDayNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema).array(),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ExerciseTemplateUpsertWithWhereUniqueWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUpsertWithWhereUniqueWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseTemplateCreateManyExerciseSplitDayInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ExerciseTemplateUpdateWithWhereUniqueWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUpdateWithWhereUniqueWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ExerciseTemplateUpdateManyWithWhereWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUpdateManyWithWhereWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ExerciseTemplateScalarWhereInputSchema),z.lazy(() => ExerciseTemplateScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ExerciseSplitUpdateOneRequiredWithoutExerciseSplitDaysNestedInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateOneRequiredWithoutExerciseSplitDaysNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutExerciseSplitDaysInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutExerciseSplitDaysInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExerciseSplitCreateOrConnectWithoutExerciseSplitDaysInputSchema).optional(),
  upsert: z.lazy(() => ExerciseSplitUpsertWithoutExerciseSplitDaysInputSchema).optional(),
  connect: z.lazy(() => ExerciseSplitWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ExerciseSplitUpdateToOneWithWhereWithoutExerciseSplitDaysInputSchema),z.lazy(() => ExerciseSplitUpdateWithoutExerciseSplitDaysInputSchema),z.lazy(() => ExerciseSplitUncheckedUpdateWithoutExerciseSplitDaysInputSchema) ]).optional(),
}).strict();

export const ExerciseTemplateUncheckedUpdateManyWithoutExerciseSplitDayNestedInputSchema: z.ZodType<Prisma.ExerciseTemplateUncheckedUpdateManyWithoutExerciseSplitDayNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema).array(),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ExerciseTemplateUpsertWithWhereUniqueWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUpsertWithWhereUniqueWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseTemplateCreateManyExerciseSplitDayInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),z.lazy(() => ExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ExerciseTemplateUpdateWithWhereUniqueWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUpdateWithWhereUniqueWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ExerciseTemplateUpdateManyWithWhereWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUpdateManyWithWhereWithoutExerciseSplitDayInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ExerciseTemplateScalarWhereInputSchema),z.lazy(() => ExerciseTemplateScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ExerciseSplitDayCreateNestedOneWithoutExercisesInputSchema: z.ZodType<Prisma.ExerciseSplitDayCreateNestedOneWithoutExercisesInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExercisesInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExercisesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExercisesInputSchema).optional(),
  connect: z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).optional()
}).strict();

export const EnumMuscleGroupFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumMuscleGroupFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => MuscleGroupSchema).optional()
}).strict();

export const NullableStringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableStringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional().nullable()
}).strict();

export const EnumSetTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumSetTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => SetTypeSchema).optional()
}).strict();

export const NullableEnumChangeTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableEnumChangeTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ChangeTypeSchema).optional().nullable()
}).strict();

export const NullableFloatFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableFloatFieldUpdateOperationsInput> = z.object({
  set: z.number().optional().nullable(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const ExerciseSplitDayUpdateOneRequiredWithoutExercisesNestedInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateOneRequiredWithoutExercisesNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExercisesInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExercisesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExerciseSplitDayCreateOrConnectWithoutExercisesInputSchema).optional(),
  upsert: z.lazy(() => ExerciseSplitDayUpsertWithoutExercisesInputSchema).optional(),
  connect: z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ExerciseSplitDayUpdateToOneWithWhereWithoutExercisesInputSchema),z.lazy(() => ExerciseSplitDayUpdateWithoutExercisesInputSchema),z.lazy(() => ExerciseSplitDayUncheckedUpdateWithoutExercisesInputSchema) ]).optional(),
}).strict();

export const MesocycleCreateRIRProgressionInputSchema: z.ZodType<Prisma.MesocycleCreateRIRProgressionInput> = z.object({
  set: z.number().array()
}).strict();

export const UserCreateNestedOneWithoutMesocycleInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutMesocycleInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutMesocycleInputSchema),z.lazy(() => UserUncheckedCreateWithoutMesocycleInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutMesocycleInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const ExerciseSplitCreateNestedOneWithoutUsedByMesocyclesInputSchema: z.ZodType<Prisma.ExerciseSplitCreateNestedOneWithoutUsedByMesocyclesInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUsedByMesocyclesInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUsedByMesocyclesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExerciseSplitCreateOrConnectWithoutUsedByMesocyclesInputSchema).optional(),
  connect: z.lazy(() => ExerciseSplitWhereUniqueInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayCreateNestedManyWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateNestedManyWithoutMesocycleInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema).array(),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleExerciseSplitDayCreateManyMesocycleInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeCreateNestedManyWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateNestedManyWithoutMesocycleInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema).array(),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCyclicSetChangeCreateManyMesocycleInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const WorkoutOfMesocycleCreateNestedManyWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateNestedManyWithoutMesocycleInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema).array(),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutOfMesocycleCreateManyMesocycleInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleExerciseSplitDayUncheckedCreateNestedManyWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedCreateNestedManyWithoutMesocycleInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema).array(),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleExerciseSplitDayCreateManyMesocycleInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeUncheckedCreateNestedManyWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUncheckedCreateNestedManyWithoutMesocycleInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema).array(),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCyclicSetChangeCreateManyMesocycleInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const WorkoutOfMesocycleUncheckedCreateNestedManyWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedCreateNestedManyWithoutMesocycleInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema).array(),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutOfMesocycleCreateManyMesocycleInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleUpdateRIRProgressionInputSchema: z.ZodType<Prisma.MesocycleUpdateRIRProgressionInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const NullableDateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableDateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional().nullable()
}).strict();

export const EnumProgressionVariableFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumProgressionVariableFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ProgressionVariableSchema).optional()
}).strict();

export const FloatFieldUpdateOperationsInputSchema: z.ZodType<Prisma.FloatFieldUpdateOperationsInput> = z.object({
  set: z.number().optional(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const UserUpdateOneRequiredWithoutMesocycleNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutMesocycleNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutMesocycleInputSchema),z.lazy(() => UserUncheckedCreateWithoutMesocycleInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutMesocycleInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutMesocycleInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutMesocycleInputSchema),z.lazy(() => UserUpdateWithoutMesocycleInputSchema),z.lazy(() => UserUncheckedUpdateWithoutMesocycleInputSchema) ]).optional(),
}).strict();

export const ExerciseSplitUpdateOneWithoutUsedByMesocyclesNestedInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateOneWithoutUsedByMesocyclesNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUsedByMesocyclesInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUsedByMesocyclesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExerciseSplitCreateOrConnectWithoutUsedByMesocyclesInputSchema).optional(),
  upsert: z.lazy(() => ExerciseSplitUpsertWithoutUsedByMesocyclesInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => ExerciseSplitWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => ExerciseSplitWhereInputSchema) ]).optional(),
  connect: z.lazy(() => ExerciseSplitWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ExerciseSplitUpdateToOneWithWhereWithoutUsedByMesocyclesInputSchema),z.lazy(() => ExerciseSplitUpdateWithoutUsedByMesocyclesInputSchema),z.lazy(() => ExerciseSplitUncheckedUpdateWithoutUsedByMesocyclesInputSchema) ]).optional(),
}).strict();

export const MesocycleExerciseSplitDayUpdateManyWithoutMesocycleNestedInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateManyWithoutMesocycleNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema).array(),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpsertWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUpsertWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleExerciseSplitDayCreateManyMesocycleInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUpdateWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateManyWithWhereWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUpdateManyWithWhereWithoutMesocycleInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema),z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeUpdateManyWithoutMesocycleNestedInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpdateManyWithoutMesocycleNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema).array(),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleCyclicSetChangeUpsertWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUpsertWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCyclicSetChangeCreateManyMesocycleInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleCyclicSetChangeUpdateWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUpdateWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleCyclicSetChangeUpdateManyWithWhereWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUpdateManyWithWhereWithoutMesocycleInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema),z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const WorkoutOfMesocycleUpdateManyWithoutMesocycleNestedInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateManyWithoutMesocycleNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema).array(),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => WorkoutOfMesocycleUpsertWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUpsertWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutOfMesocycleCreateManyMesocycleInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUpdateWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateManyWithWhereWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUpdateManyWithWhereWithoutMesocycleInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema),z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleNestedInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema).array(),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpsertWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUpsertWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleExerciseSplitDayCreateManyMesocycleInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUpdateWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateManyWithWhereWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUpdateManyWithWhereWithoutMesocycleInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema),z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleNestedInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema).array(),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleCyclicSetChangeUpsertWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUpsertWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCyclicSetChangeCreateManyMesocycleInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleCyclicSetChangeUpdateWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUpdateWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleCyclicSetChangeUpdateManyWithWhereWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUpdateManyWithWhereWithoutMesocycleInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema),z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleNestedInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema).array(),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => WorkoutOfMesocycleUpsertWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUpsertWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutOfMesocycleCreateManyMesocycleInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateWithWhereUniqueWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUpdateWithWhereUniqueWithoutMesocycleInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateManyWithWhereWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUpdateManyWithWhereWithoutMesocycleInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema),z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleCreateNestedOneWithoutMesocycleCyclicSetChangesInputSchema: z.ZodType<Prisma.MesocycleCreateNestedOneWithoutMesocycleCyclicSetChangesInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutMesocycleCyclicSetChangesInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutMesocycleCyclicSetChangesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MesocycleCreateOrConnectWithoutMesocycleCyclicSetChangesInputSchema).optional(),
  connect: z.lazy(() => MesocycleWhereUniqueInputSchema).optional()
}).strict();

export const MesocycleUpdateOneRequiredWithoutMesocycleCyclicSetChangesNestedInputSchema: z.ZodType<Prisma.MesocycleUpdateOneRequiredWithoutMesocycleCyclicSetChangesNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutMesocycleCyclicSetChangesInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutMesocycleCyclicSetChangesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MesocycleCreateOrConnectWithoutMesocycleCyclicSetChangesInputSchema).optional(),
  upsert: z.lazy(() => MesocycleUpsertWithoutMesocycleCyclicSetChangesInputSchema).optional(),
  connect: z.lazy(() => MesocycleWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MesocycleUpdateToOneWithWhereWithoutMesocycleCyclicSetChangesInputSchema),z.lazy(() => MesocycleUpdateWithoutMesocycleCyclicSetChangesInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutMesocycleCyclicSetChangesInputSchema) ]).optional(),
}).strict();

export const MesocycleCreateNestedOneWithoutMesocycleExerciseSplitDaysInputSchema: z.ZodType<Prisma.MesocycleCreateNestedOneWithoutMesocycleExerciseSplitDaysInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutMesocycleExerciseSplitDaysInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutMesocycleExerciseSplitDaysInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MesocycleCreateOrConnectWithoutMesocycleExerciseSplitDaysInputSchema).optional(),
  connect: z.lazy(() => MesocycleWhereUniqueInputSchema).optional()
}).strict();

export const MesocycleExerciseTemplateCreateNestedManyWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateNestedManyWithoutMesocycleExerciseSplitDayInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema).array(),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleExerciseTemplateUncheckedCreateNestedManyWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUncheckedCreateNestedManyWithoutMesocycleExerciseSplitDayInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema).array(),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleUpdateOneRequiredWithoutMesocycleExerciseSplitDaysNestedInputSchema: z.ZodType<Prisma.MesocycleUpdateOneRequiredWithoutMesocycleExerciseSplitDaysNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutMesocycleExerciseSplitDaysInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutMesocycleExerciseSplitDaysInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MesocycleCreateOrConnectWithoutMesocycleExerciseSplitDaysInputSchema).optional(),
  upsert: z.lazy(() => MesocycleUpsertWithoutMesocycleExerciseSplitDaysInputSchema).optional(),
  connect: z.lazy(() => MesocycleWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MesocycleUpdateToOneWithWhereWithoutMesocycleExerciseSplitDaysInputSchema),z.lazy(() => MesocycleUpdateWithoutMesocycleExerciseSplitDaysInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutMesocycleExerciseSplitDaysInputSchema) ]).optional(),
}).strict();

export const MesocycleExerciseTemplateUpdateManyWithoutMesocycleExerciseSplitDayNestedInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpdateManyWithoutMesocycleExerciseSplitDayNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema).array(),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleExerciseTemplateUpsertWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUpsertWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleExerciseTemplateUpdateWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUpdateWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleExerciseTemplateUpdateManyWithWhereWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUpdateManyWithWhereWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema),z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleExerciseTemplateUncheckedUpdateManyWithoutMesocycleExerciseSplitDayNestedInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUncheckedUpdateManyWithoutMesocycleExerciseSplitDayNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema).array(),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleExerciseTemplateUpsertWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUpsertWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleExerciseTemplateUpdateWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUpdateWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleExerciseTemplateUpdateManyWithWhereWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUpdateManyWithWhereWithoutMesocycleExerciseSplitDayInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema),z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleExerciseSplitDayCreateNestedOneWithoutMesocycleSplitDayExercisesInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateNestedOneWithoutMesocycleSplitDayExercisesInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleSplitDayExercisesInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleSplitDayExercisesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleSplitDayExercisesInputSchema).optional(),
  connect: z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).optional()
}).strict();

export const NullableEnumProgressionVariableFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableEnumProgressionVariableFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ProgressionVariableSchema).optional().nullable()
}).strict();

export const NullableBoolFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableBoolFieldUpdateOperationsInput> = z.object({
  set: z.boolean().optional().nullable()
}).strict();

export const MesocycleExerciseSplitDayUpdateOneRequiredWithoutMesocycleSplitDayExercisesNestedInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateOneRequiredWithoutMesocycleSplitDayExercisesNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleSplitDayExercisesInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleSplitDayExercisesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleSplitDayExercisesInputSchema).optional(),
  upsert: z.lazy(() => MesocycleExerciseSplitDayUpsertWithoutMesocycleSplitDayExercisesInputSchema).optional(),
  connect: z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateToOneWithWhereWithoutMesocycleSplitDayExercisesInputSchema),z.lazy(() => MesocycleExerciseSplitDayUpdateWithoutMesocycleSplitDayExercisesInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateWithoutMesocycleSplitDayExercisesInputSchema) ]).optional(),
}).strict();

export const AccountCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AccountCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema),z.lazy(() => AccountCreateWithoutUserInputSchema).array(),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema),z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const SessionCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.SessionCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema),z.lazy(() => SessionCreateWithoutUserInputSchema).array(),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema),z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ExerciseSplitCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema).array(),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseSplitCreateOrConnectWithoutUserInputSchema),z.lazy(() => ExerciseSplitCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseSplitCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.MesocycleCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutUserInputSchema),z.lazy(() => MesocycleCreateWithoutUserInputSchema).array(),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCreateOrConnectWithoutUserInputSchema),z.lazy(() => MesocycleCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const WorkoutCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.WorkoutCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutCreateWithoutUserInputSchema),z.lazy(() => WorkoutCreateWithoutUserInputSchema).array(),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutCreateOrConnectWithoutUserInputSchema),z.lazy(() => WorkoutCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const AccountUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema),z.lazy(() => AccountCreateWithoutUserInputSchema).array(),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema),z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const SessionUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema),z.lazy(() => SessionCreateWithoutUserInputSchema).array(),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema),z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ExerciseSplitUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema).array(),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseSplitCreateOrConnectWithoutUserInputSchema),z.lazy(() => ExerciseSplitCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseSplitCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MesocycleUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.MesocycleUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutUserInputSchema),z.lazy(() => MesocycleCreateWithoutUserInputSchema).array(),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCreateOrConnectWithoutUserInputSchema),z.lazy(() => MesocycleCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const WorkoutUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.WorkoutUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutCreateWithoutUserInputSchema),z.lazy(() => WorkoutCreateWithoutUserInputSchema).array(),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutCreateOrConnectWithoutUserInputSchema),z.lazy(() => WorkoutCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const DateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.DateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional()
}).strict();

export const AccountUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AccountUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema),z.lazy(() => AccountCreateWithoutUserInputSchema).array(),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema),z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AccountUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => AccountUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AccountUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => AccountUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AccountUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => AccountUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AccountScalarWhereInputSchema),z.lazy(() => AccountScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const SessionUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.SessionUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema),z.lazy(() => SessionCreateWithoutUserInputSchema).array(),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema),z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => SessionUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => SessionUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => SessionUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => SessionUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => SessionUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => SessionUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => SessionScalarWhereInputSchema),z.lazy(() => SessionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ExerciseSplitUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema).array(),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseSplitCreateOrConnectWithoutUserInputSchema),z.lazy(() => ExerciseSplitCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ExerciseSplitUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => ExerciseSplitUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseSplitCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ExerciseSplitUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => ExerciseSplitUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ExerciseSplitUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => ExerciseSplitUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ExerciseSplitScalarWhereInputSchema),z.lazy(() => ExerciseSplitScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.MesocycleUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutUserInputSchema),z.lazy(() => MesocycleCreateWithoutUserInputSchema).array(),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCreateOrConnectWithoutUserInputSchema),z.lazy(() => MesocycleCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => MesocycleUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => MesocycleUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => MesocycleUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleScalarWhereInputSchema),z.lazy(() => MesocycleScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const WorkoutUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.WorkoutUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutCreateWithoutUserInputSchema),z.lazy(() => WorkoutCreateWithoutUserInputSchema).array(),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutCreateOrConnectWithoutUserInputSchema),z.lazy(() => WorkoutCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => WorkoutUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => WorkoutUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => WorkoutUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => WorkoutUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => WorkoutUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => WorkoutUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => WorkoutScalarWhereInputSchema),z.lazy(() => WorkoutScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const AccountUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema),z.lazy(() => AccountCreateWithoutUserInputSchema).array(),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema),z.lazy(() => AccountCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => AccountUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => AccountUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => AccountCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => AccountWhereUniqueInputSchema),z.lazy(() => AccountWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => AccountUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => AccountUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => AccountUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => AccountUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => AccountScalarWhereInputSchema),z.lazy(() => AccountScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const SessionUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema),z.lazy(() => SessionCreateWithoutUserInputSchema).array(),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema),z.lazy(() => SessionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => SessionUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => SessionUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => SessionCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => SessionWhereUniqueInputSchema),z.lazy(() => SessionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => SessionUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => SessionUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => SessionUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => SessionUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => SessionScalarWhereInputSchema),z.lazy(() => SessionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ExerciseSplitUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema).array(),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ExerciseSplitCreateOrConnectWithoutUserInputSchema),z.lazy(() => ExerciseSplitCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ExerciseSplitUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => ExerciseSplitUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ExerciseSplitCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ExerciseSplitWhereUniqueInputSchema),z.lazy(() => ExerciseSplitWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ExerciseSplitUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => ExerciseSplitUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ExerciseSplitUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => ExerciseSplitUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ExerciseSplitScalarWhereInputSchema),z.lazy(() => ExerciseSplitScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MesocycleUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutUserInputSchema),z.lazy(() => MesocycleCreateWithoutUserInputSchema).array(),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MesocycleCreateOrConnectWithoutUserInputSchema),z.lazy(() => MesocycleCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MesocycleUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => MesocycleUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MesocycleCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MesocycleWhereUniqueInputSchema),z.lazy(() => MesocycleWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MesocycleUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => MesocycleUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MesocycleUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => MesocycleUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MesocycleScalarWhereInputSchema),z.lazy(() => MesocycleScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const WorkoutUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.WorkoutUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutCreateWithoutUserInputSchema),z.lazy(() => WorkoutCreateWithoutUserInputSchema).array(),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutCreateOrConnectWithoutUserInputSchema),z.lazy(() => WorkoutCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => WorkoutUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => WorkoutUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => WorkoutWhereUniqueInputSchema),z.lazy(() => WorkoutWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => WorkoutUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => WorkoutUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => WorkoutUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => WorkoutUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => WorkoutScalarWhereInputSchema),z.lazy(() => WorkoutScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutAccountsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutAccountsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema),z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAccountsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const NullableIntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableIntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional().nullable(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const UserUpdateOneRequiredWithoutAccountsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutAccountsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema),z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutAccountsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutAccountsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutAccountsInputSchema),z.lazy(() => UserUpdateWithoutAccountsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutAccountsInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutSessionsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutSessionsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema),z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSessionsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const UserUpdateOneRequiredWithoutSessionsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutSessionsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema),z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSessionsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutSessionsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutSessionsInputSchema),z.lazy(() => UserUpdateWithoutSessionsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutSessionsInputSchema) ]).optional(),
}).strict();

export const WorkoutCreateNestedOneWithoutWorkoutOfMesocycleInputSchema: z.ZodType<Prisma.WorkoutCreateNestedOneWithoutWorkoutOfMesocycleInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutCreateWithoutWorkoutOfMesocycleInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutWorkoutOfMesocycleInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutCreateOrConnectWithoutWorkoutOfMesocycleInputSchema).optional(),
  connect: z.lazy(() => WorkoutWhereUniqueInputSchema).optional()
}).strict();

export const MesocycleCreateNestedOneWithoutWorkoutsOfMesocycleInputSchema: z.ZodType<Prisma.MesocycleCreateNestedOneWithoutWorkoutsOfMesocycleInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutWorkoutsOfMesocycleInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutWorkoutsOfMesocycleInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MesocycleCreateOrConnectWithoutWorkoutsOfMesocycleInputSchema).optional(),
  connect: z.lazy(() => MesocycleWhereUniqueInputSchema).optional()
}).strict();

export const NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableEnumWorkoutStatusFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => WorkoutStatusSchema).optional().nullable()
}).strict();

export const WorkoutUpdateOneRequiredWithoutWorkoutOfMesocycleNestedInputSchema: z.ZodType<Prisma.WorkoutUpdateOneRequiredWithoutWorkoutOfMesocycleNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutCreateWithoutWorkoutOfMesocycleInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutWorkoutOfMesocycleInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutCreateOrConnectWithoutWorkoutOfMesocycleInputSchema).optional(),
  upsert: z.lazy(() => WorkoutUpsertWithoutWorkoutOfMesocycleInputSchema).optional(),
  connect: z.lazy(() => WorkoutWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => WorkoutUpdateToOneWithWhereWithoutWorkoutOfMesocycleInputSchema),z.lazy(() => WorkoutUpdateWithoutWorkoutOfMesocycleInputSchema),z.lazy(() => WorkoutUncheckedUpdateWithoutWorkoutOfMesocycleInputSchema) ]).optional(),
}).strict();

export const MesocycleUpdateOneRequiredWithoutWorkoutsOfMesocycleNestedInputSchema: z.ZodType<Prisma.MesocycleUpdateOneRequiredWithoutWorkoutsOfMesocycleNestedInput> = z.object({
  create: z.union([ z.lazy(() => MesocycleCreateWithoutWorkoutsOfMesocycleInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutWorkoutsOfMesocycleInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MesocycleCreateOrConnectWithoutWorkoutsOfMesocycleInputSchema).optional(),
  upsert: z.lazy(() => MesocycleUpsertWithoutWorkoutsOfMesocycleInputSchema).optional(),
  connect: z.lazy(() => MesocycleWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MesocycleUpdateToOneWithWhereWithoutWorkoutsOfMesocycleInputSchema),z.lazy(() => MesocycleUpdateWithoutWorkoutsOfMesocycleInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutWorkoutsOfMesocycleInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutWorkoutInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutWorkoutInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutWorkoutInputSchema),z.lazy(() => UserUncheckedCreateWithoutWorkoutInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutWorkoutInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleCreateNestedOneWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateNestedOneWithoutWorkoutInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutWorkoutInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutWorkoutInputSchema).optional(),
  connect: z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).optional()
}).strict();

export const WorkoutExerciseCreateNestedManyWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseCreateNestedManyWithoutWorkoutInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema).array(),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutExerciseCreateOrConnectWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseCreateOrConnectWithoutWorkoutInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutExerciseCreateManyWorkoutInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const WorkoutOfMesocycleUncheckedCreateNestedOneWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedCreateNestedOneWithoutWorkoutInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutWorkoutInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutWorkoutInputSchema).optional(),
  connect: z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).optional()
}).strict();

export const WorkoutExerciseUncheckedCreateNestedManyWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedCreateNestedManyWithoutWorkoutInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema).array(),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutExerciseCreateOrConnectWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseCreateOrConnectWithoutWorkoutInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutExerciseCreateManyWorkoutInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const UserUpdateOneRequiredWithoutWorkoutNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutWorkoutNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutWorkoutInputSchema),z.lazy(() => UserUncheckedCreateWithoutWorkoutInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutWorkoutInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutWorkoutInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutWorkoutInputSchema),z.lazy(() => UserUpdateWithoutWorkoutInputSchema),z.lazy(() => UserUncheckedUpdateWithoutWorkoutInputSchema) ]).optional(),
}).strict();

export const WorkoutOfMesocycleUpdateOneWithoutWorkoutNestedInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateOneWithoutWorkoutNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutWorkoutInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutWorkoutInputSchema).optional(),
  upsert: z.lazy(() => WorkoutOfMesocycleUpsertWithoutWorkoutInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => WorkoutOfMesocycleWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => WorkoutOfMesocycleWhereInputSchema) ]).optional(),
  connect: z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateToOneWithWhereWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUpdateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedUpdateWithoutWorkoutInputSchema) ]).optional(),
}).strict();

export const WorkoutExerciseUpdateManyWithoutWorkoutNestedInputSchema: z.ZodType<Prisma.WorkoutExerciseUpdateManyWithoutWorkoutNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema).array(),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutExerciseCreateOrConnectWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseCreateOrConnectWithoutWorkoutInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => WorkoutExerciseUpsertWithWhereUniqueWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUpsertWithWhereUniqueWithoutWorkoutInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutExerciseCreateManyWorkoutInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => WorkoutExerciseUpdateWithWhereUniqueWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUpdateWithWhereUniqueWithoutWorkoutInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => WorkoutExerciseUpdateManyWithWhereWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUpdateManyWithWhereWithoutWorkoutInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => WorkoutExerciseScalarWhereInputSchema),z.lazy(() => WorkoutExerciseScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const WorkoutOfMesocycleUncheckedUpdateOneWithoutWorkoutNestedInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedUpdateOneWithoutWorkoutNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutWorkoutInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutOfMesocycleCreateOrConnectWithoutWorkoutInputSchema).optional(),
  upsert: z.lazy(() => WorkoutOfMesocycleUpsertWithoutWorkoutInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => WorkoutOfMesocycleWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => WorkoutOfMesocycleWhereInputSchema) ]).optional(),
  connect: z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateToOneWithWhereWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUpdateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedUpdateWithoutWorkoutInputSchema) ]).optional(),
}).strict();

export const WorkoutExerciseUncheckedUpdateManyWithoutWorkoutNestedInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedUpdateManyWithoutWorkoutNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema).array(),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WorkoutExerciseCreateOrConnectWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseCreateOrConnectWithoutWorkoutInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => WorkoutExerciseUpsertWithWhereUniqueWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUpsertWithWhereUniqueWithoutWorkoutInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WorkoutExerciseCreateManyWorkoutInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => WorkoutExerciseUpdateWithWhereUniqueWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUpdateWithWhereUniqueWithoutWorkoutInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => WorkoutExerciseUpdateManyWithWhereWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUpdateManyWithWhereWithoutWorkoutInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => WorkoutExerciseScalarWhereInputSchema),z.lazy(() => WorkoutExerciseScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const WorkoutCreateNestedOneWithoutWorkoutExercisesInputSchema: z.ZodType<Prisma.WorkoutCreateNestedOneWithoutWorkoutExercisesInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutCreateWithoutWorkoutExercisesInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutWorkoutExercisesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutCreateOrConnectWithoutWorkoutExercisesInputSchema).optional(),
  connect: z.lazy(() => WorkoutWhereUniqueInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateNestedOneWithoutWorkoutExerciseInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateNestedOneWithoutWorkoutExerciseInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutWorkoutExerciseInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional()
}).strict();

export const WorkoutUpdateOneRequiredWithoutWorkoutExercisesNestedInputSchema: z.ZodType<Prisma.WorkoutUpdateOneRequiredWithoutWorkoutExercisesNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutCreateWithoutWorkoutExercisesInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutWorkoutExercisesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutCreateOrConnectWithoutWorkoutExercisesInputSchema).optional(),
  upsert: z.lazy(() => WorkoutUpsertWithoutWorkoutExercisesInputSchema).optional(),
  connect: z.lazy(() => WorkoutWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => WorkoutUpdateToOneWithWhereWithoutWorkoutExercisesInputSchema),z.lazy(() => WorkoutUpdateWithoutWorkoutExercisesInputSchema),z.lazy(() => WorkoutUncheckedUpdateWithoutWorkoutExercisesInputSchema) ]).optional(),
}).strict();

export const SetsOfWorkoutExerciseUpdateOneRequiredWithoutWorkoutExerciseNestedInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateOneRequiredWithoutWorkoutExerciseNestedInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutWorkoutExerciseInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutWorkoutExerciseInputSchema).optional(),
  upsert: z.lazy(() => SetsOfWorkoutExerciseUpsertWithoutWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutWorkoutExerciseInputSchema),z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutWorkoutExerciseInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutWorkoutExerciseInputSchema) ]).optional(),
}).strict();

export const WorkoutExerciseCreateNestedOneWithoutSetDataInputSchema: z.ZodType<Prisma.WorkoutExerciseCreateNestedOneWithoutSetDataInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutSetDataInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutExerciseCreateOrConnectWithoutSetDataInputSchema).optional(),
  connect: z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).optional()
}).strict();

export const StraightSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.StraightSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInput> = z.object({
  create: z.union([ z.lazy(() => StraightSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => StraightSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => StraightSetsWhereUniqueInputSchema).optional()
}).strict();

export const FixedChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.FixedChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInput> = z.object({
  create: z.union([ z.lazy(() => FixedChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => FixedChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => FixedChangeSetsWhereUniqueInputSchema).optional()
}).strict();

export const VariableChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.VariableChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInput> = z.object({
  create: z.union([ z.lazy(() => VariableChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => VariableChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => VariableChangeSetsWhereUniqueInputSchema).optional()
}).strict();

export const MyorepMatchSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.MyorepMatchSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MyorepMatchSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => MyorepMatchSetsWhereUniqueInputSchema).optional()
}).strict();

export const WorkoutExerciseUncheckedCreateNestedOneWithoutSetDataInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedCreateNestedOneWithoutSetDataInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutSetDataInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutExerciseCreateOrConnectWithoutSetDataInputSchema).optional(),
  connect: z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).optional()
}).strict();

export const StraightSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.StraightSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInput> = z.object({
  create: z.union([ z.lazy(() => StraightSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => StraightSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => StraightSetsWhereUniqueInputSchema).optional()
}).strict();

export const FixedChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.FixedChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInput> = z.object({
  create: z.union([ z.lazy(() => FixedChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => FixedChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => FixedChangeSetsWhereUniqueInputSchema).optional()
}).strict();

export const VariableChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.VariableChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInput> = z.object({
  create: z.union([ z.lazy(() => VariableChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => VariableChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => VariableChangeSetsWhereUniqueInputSchema).optional()
}).strict();

export const MyorepMatchSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.MyorepMatchSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MyorepMatchSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  connect: z.lazy(() => MyorepMatchSetsWhereUniqueInputSchema).optional()
}).strict();

export const WorkoutExerciseUpdateOneWithoutSetDataNestedInputSchema: z.ZodType<Prisma.WorkoutExerciseUpdateOneWithoutSetDataNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutSetDataInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutExerciseCreateOrConnectWithoutSetDataInputSchema).optional(),
  upsert: z.lazy(() => WorkoutExerciseUpsertWithoutSetDataInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => WorkoutExerciseWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => WorkoutExerciseWhereInputSchema) ]).optional(),
  connect: z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => WorkoutExerciseUpdateToOneWithWhereWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUpdateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedUpdateWithoutSetDataInputSchema) ]).optional(),
}).strict();

export const StraightSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema: z.ZodType<Prisma.StraightSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInput> = z.object({
  create: z.union([ z.lazy(() => StraightSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => StraightSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  upsert: z.lazy(() => StraightSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => StraightSetsWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => StraightSetsWhereInputSchema) ]).optional(),
  connect: z.lazy(() => StraightSetsWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => StraightSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
}).strict();

export const FixedChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema: z.ZodType<Prisma.FixedChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInput> = z.object({
  create: z.union([ z.lazy(() => FixedChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => FixedChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  upsert: z.lazy(() => FixedChangeSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => FixedChangeSetsWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => FixedChangeSetsWhereInputSchema) ]).optional(),
  connect: z.lazy(() => FixedChangeSetsWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => FixedChangeSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
}).strict();

export const VariableChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema: z.ZodType<Prisma.VariableChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInput> = z.object({
  create: z.union([ z.lazy(() => VariableChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => VariableChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  upsert: z.lazy(() => VariableChangeSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => VariableChangeSetsWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => VariableChangeSetsWhereInputSchema) ]).optional(),
  connect: z.lazy(() => VariableChangeSetsWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => VariableChangeSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
}).strict();

export const MyorepMatchSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MyorepMatchSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  upsert: z.lazy(() => MyorepMatchSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MyorepMatchSetsWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MyorepMatchSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
}).strict();

export const WorkoutExerciseUncheckedUpdateOneWithoutSetDataNestedInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedUpdateOneWithoutSetDataNestedInput> = z.object({
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutSetDataInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WorkoutExerciseCreateOrConnectWithoutSetDataInputSchema).optional(),
  upsert: z.lazy(() => WorkoutExerciseUpsertWithoutSetDataInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => WorkoutExerciseWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => WorkoutExerciseWhereInputSchema) ]).optional(),
  connect: z.lazy(() => WorkoutExerciseWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => WorkoutExerciseUpdateToOneWithWhereWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUpdateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedUpdateWithoutSetDataInputSchema) ]).optional(),
}).strict();

export const StraightSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema: z.ZodType<Prisma.StraightSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInput> = z.object({
  create: z.union([ z.lazy(() => StraightSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => StraightSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  upsert: z.lazy(() => StraightSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => StraightSetsWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => StraightSetsWhereInputSchema) ]).optional(),
  connect: z.lazy(() => StraightSetsWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => StraightSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
}).strict();

export const FixedChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema: z.ZodType<Prisma.FixedChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInput> = z.object({
  create: z.union([ z.lazy(() => FixedChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => FixedChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  upsert: z.lazy(() => FixedChangeSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => FixedChangeSetsWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => FixedChangeSetsWhereInputSchema) ]).optional(),
  connect: z.lazy(() => FixedChangeSetsWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => FixedChangeSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
}).strict();

export const VariableChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema: z.ZodType<Prisma.VariableChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInput> = z.object({
  create: z.union([ z.lazy(() => VariableChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => VariableChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  upsert: z.lazy(() => VariableChangeSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => VariableChangeSetsWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => VariableChangeSetsWhereInputSchema) ]).optional(),
  connect: z.lazy(() => VariableChangeSetsWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => VariableChangeSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
}).strict();

export const MyorepMatchSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema: z.ZodType<Prisma.MyorepMatchSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MyorepMatchSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  upsert: z.lazy(() => MyorepMatchSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MyorepMatchSetsWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MyorepMatchSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]).optional(),
}).strict();

export const StraightSetsCreaterepNumbersInputSchema: z.ZodType<Prisma.StraightSetsCreaterepNumbersInput> = z.object({
  set: z.number().array()
}).strict();

export const StraightSetsCreateRIRNumbersInputSchema: z.ZodType<Prisma.StraightSetsCreateRIRNumbersInput> = z.object({
  set: z.number().array()
}).strict();

export const SetsOfWorkoutExerciseCreateNestedOneWithoutStraightSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateNestedOneWithoutStraightSetsInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutStraightSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutStraightSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutStraightSetsInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional()
}).strict();

export const StraightSetsUpdaterepNumbersInputSchema: z.ZodType<Prisma.StraightSetsUpdaterepNumbersInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const StraightSetsUpdateRIRNumbersInputSchema: z.ZodType<Prisma.StraightSetsUpdateRIRNumbersInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const SetsOfWorkoutExerciseUpdateOneRequiredWithoutStraightSetsNestedInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateOneRequiredWithoutStraightSetsNestedInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutStraightSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutStraightSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutStraightSetsInputSchema).optional(),
  upsert: z.lazy(() => SetsOfWorkoutExerciseUpsertWithoutStraightSetsInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutStraightSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutStraightSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutStraightSetsInputSchema) ]).optional(),
}).strict();

export const FixedChangeSetsCreateloadNumbersInputSchema: z.ZodType<Prisma.FixedChangeSetsCreateloadNumbersInput> = z.object({
  set: z.number().array()
}).strict();

export const FixedChangeSetsCreaterepNumbersInputSchema: z.ZodType<Prisma.FixedChangeSetsCreaterepNumbersInput> = z.object({
  set: z.number().array()
}).strict();

export const FixedChangeSetsCreateRIRNumbersInputSchema: z.ZodType<Prisma.FixedChangeSetsCreateRIRNumbersInput> = z.object({
  set: z.number().array()
}).strict();

export const SetsOfWorkoutExerciseCreateNestedOneWithoutFixedChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateNestedOneWithoutFixedChangeSetsInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutFixedChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutFixedChangeSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutFixedChangeSetsInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional()
}).strict();

export const FixedChangeSetsUpdateloadNumbersInputSchema: z.ZodType<Prisma.FixedChangeSetsUpdateloadNumbersInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const FixedChangeSetsUpdaterepNumbersInputSchema: z.ZodType<Prisma.FixedChangeSetsUpdaterepNumbersInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const FixedChangeSetsUpdateRIRNumbersInputSchema: z.ZodType<Prisma.FixedChangeSetsUpdateRIRNumbersInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const EnumChangeTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumChangeTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ChangeTypeSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUpdateOneRequiredWithoutFixedChangeSetsNestedInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateOneRequiredWithoutFixedChangeSetsNestedInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutFixedChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutFixedChangeSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutFixedChangeSetsInputSchema).optional(),
  upsert: z.lazy(() => SetsOfWorkoutExerciseUpsertWithoutFixedChangeSetsInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutFixedChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutFixedChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutFixedChangeSetsInputSchema) ]).optional(),
}).strict();

export const VariableChangeSetsCreateloadNumbersInputSchema: z.ZodType<Prisma.VariableChangeSetsCreateloadNumbersInput> = z.object({
  set: z.number().array()
}).strict();

export const VariableChangeSetsCreaterepNumbersInputSchema: z.ZodType<Prisma.VariableChangeSetsCreaterepNumbersInput> = z.object({
  set: z.number().array()
}).strict();

export const VariableChangeSetsCreateRIRNumbersInputSchema: z.ZodType<Prisma.VariableChangeSetsCreateRIRNumbersInput> = z.object({
  set: z.number().array()
}).strict();

export const SetsOfWorkoutExerciseCreateNestedOneWithoutVariableChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateNestedOneWithoutVariableChangeSetsInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutVariableChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutVariableChangeSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutVariableChangeSetsInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional()
}).strict();

export const VariableChangeSetsUpdateloadNumbersInputSchema: z.ZodType<Prisma.VariableChangeSetsUpdateloadNumbersInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const VariableChangeSetsUpdaterepNumbersInputSchema: z.ZodType<Prisma.VariableChangeSetsUpdaterepNumbersInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const VariableChangeSetsUpdateRIRNumbersInputSchema: z.ZodType<Prisma.VariableChangeSetsUpdateRIRNumbersInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const SetsOfWorkoutExerciseUpdateOneRequiredWithoutVariableChangeSetsNestedInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateOneRequiredWithoutVariableChangeSetsNestedInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutVariableChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutVariableChangeSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutVariableChangeSetsInputSchema).optional(),
  upsert: z.lazy(() => SetsOfWorkoutExerciseUpsertWithoutVariableChangeSetsInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutVariableChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutVariableChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutVariableChangeSetsInputSchema) ]).optional(),
}).strict();

export const MyorepMatchSetCreateNestedManyWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetCreateNestedManyWithoutMyorepMatchSetsInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema).array(),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MyorepMatchSetCreateManyMyorepMatchSetsInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const SetsOfWorkoutExerciseCreateNestedOneWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateNestedOneWithoutMyorepMatchSetsInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutMyorepMatchSetsInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional()
}).strict();

export const MyorepMatchSetUncheckedCreateNestedManyWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetUncheckedCreateNestedManyWithoutMyorepMatchSetsInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema).array(),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MyorepMatchSetCreateManyMyorepMatchSetsInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MyorepMatchSetUpdateManyWithoutMyorepMatchSetsNestedInputSchema: z.ZodType<Prisma.MyorepMatchSetUpdateManyWithoutMyorepMatchSetsNestedInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema).array(),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MyorepMatchSetUpsertWithWhereUniqueWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUpsertWithWhereUniqueWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MyorepMatchSetCreateManyMyorepMatchSetsInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MyorepMatchSetUpdateWithWhereUniqueWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUpdateWithWhereUniqueWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MyorepMatchSetUpdateManyWithWhereWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUpdateManyWithWhereWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MyorepMatchSetScalarWhereInputSchema),z.lazy(() => MyorepMatchSetScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const SetsOfWorkoutExerciseUpdateOneRequiredWithoutMyorepMatchSetsNestedInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateOneRequiredWithoutMyorepMatchSetsNestedInput> = z.object({
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => SetsOfWorkoutExerciseCreateOrConnectWithoutMyorepMatchSetsInputSchema).optional(),
  upsert: z.lazy(() => SetsOfWorkoutExerciseUpsertWithoutMyorepMatchSetsInputSchema).optional(),
  connect: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutMyorepMatchSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutMyorepMatchSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutMyorepMatchSetsInputSchema) ]).optional(),
}).strict();

export const MyorepMatchSetUncheckedUpdateManyWithoutMyorepMatchSetsNestedInputSchema: z.ZodType<Prisma.MyorepMatchSetUncheckedUpdateManyWithoutMyorepMatchSetsNestedInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema).array(),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MyorepMatchSetUpsertWithWhereUniqueWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUpsertWithWhereUniqueWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MyorepMatchSetCreateManyMyorepMatchSetsInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),z.lazy(() => MyorepMatchSetWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MyorepMatchSetUpdateWithWhereUniqueWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUpdateWithWhereUniqueWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MyorepMatchSetUpdateManyWithWhereWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUpdateManyWithWhereWithoutMyorepMatchSetsInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MyorepMatchSetScalarWhereInputSchema),z.lazy(() => MyorepMatchSetScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MyorepMatchSetCreatemyorepsInputSchema: z.ZodType<Prisma.MyorepMatchSetCreatemyorepsInput> = z.object({
  set: z.number().array()
}).strict();

export const MyorepMatchSetsCreateNestedOneWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetsCreateNestedOneWithoutMyorepMatchSetsInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MyorepMatchSetsCreateOrConnectWithoutMyorepMatchSetsInputSchema).optional(),
  connect: z.lazy(() => MyorepMatchSetsWhereUniqueInputSchema).optional()
}).strict();

export const MyorepMatchSetUpdatemyorepsInputSchema: z.ZodType<Prisma.MyorepMatchSetUpdatemyorepsInput> = z.object({
  set: z.number().array().optional(),
  push: z.union([ z.number(),z.number().array() ]).optional(),
}).strict();

export const MyorepMatchSetsUpdateOneWithoutMyorepMatchSetsNestedInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateOneWithoutMyorepMatchSetsNestedInput> = z.object({
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => MyorepMatchSetsCreateOrConnectWithoutMyorepMatchSetsInputSchema).optional(),
  upsert: z.lazy(() => MyorepMatchSetsUpsertWithoutMyorepMatchSetsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => MyorepMatchSetsWhereInputSchema) ]).optional(),
  connect: z.lazy(() => MyorepMatchSetsWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => MyorepMatchSetsUpdateToOneWithWhereWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetsUpdateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetsUncheckedUpdateWithoutMyorepMatchSetsInputSchema) ]).optional(),
}).strict();

export const NestedStringFilterSchema: z.ZodType<Prisma.NestedStringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const NestedStringWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional()
}).strict();

export const NestedIntFilterSchema: z.ZodType<Prisma.NestedIntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

export const NestedBoolFilterSchema: z.ZodType<Prisma.NestedBoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const NestedIntWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedIntFilterSchema).optional(),
  _max: z.lazy(() => NestedIntFilterSchema).optional()
}).strict();

export const NestedFloatFilterSchema: z.ZodType<Prisma.NestedFloatFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatFilterSchema) ]).optional(),
}).strict();

export const NestedBoolWithAggregatesFilterSchema: z.ZodType<Prisma.NestedBoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional()
}).strict();

export const NestedEnumMuscleGroupFilterSchema: z.ZodType<Prisma.NestedEnumMuscleGroupFilter> = z.object({
  equals: z.lazy(() => MuscleGroupSchema).optional(),
  in: z.lazy(() => MuscleGroupSchema).array().optional(),
  notIn: z.lazy(() => MuscleGroupSchema).array().optional(),
  not: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => NestedEnumMuscleGroupFilterSchema) ]).optional(),
}).strict();

export const NestedStringNullableFilterSchema: z.ZodType<Prisma.NestedStringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumSetTypeFilterSchema: z.ZodType<Prisma.NestedEnumSetTypeFilter> = z.object({
  equals: z.lazy(() => SetTypeSchema).optional(),
  in: z.lazy(() => SetTypeSchema).array().optional(),
  notIn: z.lazy(() => SetTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => NestedEnumSetTypeFilterSchema) ]).optional(),
}).strict();

export const NestedEnumChangeTypeNullableFilterSchema: z.ZodType<Prisma.NestedEnumChangeTypeNullableFilter> = z.object({
  equals: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  in: z.lazy(() => ChangeTypeSchema).array().optional().nullable(),
  notIn: z.lazy(() => ChangeTypeSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NestedEnumChangeTypeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedFloatNullableFilterSchema: z.ZodType<Prisma.NestedFloatNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumMuscleGroupWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumMuscleGroupWithAggregatesFilter> = z.object({
  equals: z.lazy(() => MuscleGroupSchema).optional(),
  in: z.lazy(() => MuscleGroupSchema).array().optional(),
  notIn: z.lazy(() => MuscleGroupSchema).array().optional(),
  not: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => NestedEnumMuscleGroupWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumMuscleGroupFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumMuscleGroupFilterSchema).optional()
}).strict();

export const NestedStringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional()
}).strict();

export const NestedIntNullableFilterSchema: z.ZodType<Prisma.NestedIntNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumSetTypeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumSetTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => SetTypeSchema).optional(),
  in: z.lazy(() => SetTypeSchema).array().optional(),
  notIn: z.lazy(() => SetTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => NestedEnumSetTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumSetTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumSetTypeFilterSchema).optional()
}).strict();

export const NestedEnumChangeTypeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumChangeTypeNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  in: z.lazy(() => ChangeTypeSchema).array().optional().nullable(),
  notIn: z.lazy(() => ChangeTypeSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NestedEnumChangeTypeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumChangeTypeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumChangeTypeNullableFilterSchema).optional()
}).strict();

export const NestedFloatNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedFloatNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatNullableFilterSchema).optional()
}).strict();

export const NestedDateTimeNullableFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumProgressionVariableFilterSchema: z.ZodType<Prisma.NestedEnumProgressionVariableFilter> = z.object({
  equals: z.lazy(() => ProgressionVariableSchema).optional(),
  in: z.lazy(() => ProgressionVariableSchema).array().optional(),
  notIn: z.lazy(() => ProgressionVariableSchema).array().optional(),
  not: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NestedEnumProgressionVariableFilterSchema) ]).optional(),
}).strict();

export const NestedDateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional()
}).strict();

export const NestedEnumProgressionVariableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumProgressionVariableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ProgressionVariableSchema).optional(),
  in: z.lazy(() => ProgressionVariableSchema).array().optional(),
  notIn: z.lazy(() => ProgressionVariableSchema).array().optional(),
  not: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NestedEnumProgressionVariableWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumProgressionVariableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumProgressionVariableFilterSchema).optional()
}).strict();

export const NestedFloatWithAggregatesFilterSchema: z.ZodType<Prisma.NestedFloatWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatFilterSchema).optional()
}).strict();

export const NestedEnumProgressionVariableNullableFilterSchema: z.ZodType<Prisma.NestedEnumProgressionVariableNullableFilter> = z.object({
  equals: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  in: z.lazy(() => ProgressionVariableSchema).array().optional().nullable(),
  notIn: z.lazy(() => ProgressionVariableSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NestedEnumProgressionVariableNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedBoolNullableFilterSchema: z.ZodType<Prisma.NestedBoolNullableFilter> = z.object({
  equals: z.boolean().optional().nullable(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumProgressionVariableNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumProgressionVariableNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  in: z.lazy(() => ProgressionVariableSchema).array().optional().nullable(),
  notIn: z.lazy(() => ProgressionVariableSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NestedEnumProgressionVariableNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumProgressionVariableNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumProgressionVariableNullableFilterSchema).optional()
}).strict();

export const NestedBoolNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedBoolNullableWithAggregatesFilter> = z.object({
  equals: z.boolean().optional().nullable(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolNullableFilterSchema).optional()
}).strict();

export const NestedDateTimeFilterSchema: z.ZodType<Prisma.NestedDateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const NestedDateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional()
}).strict();

export const NestedIntNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional()
}).strict();

export const NestedEnumWorkoutStatusNullableFilterSchema: z.ZodType<Prisma.NestedEnumWorkoutStatusNullableFilter> = z.object({
  equals: z.lazy(() => WorkoutStatusSchema).optional().nullable(),
  in: z.lazy(() => WorkoutStatusSchema).array().optional().nullable(),
  notIn: z.lazy(() => WorkoutStatusSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NestedEnumWorkoutStatusNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumWorkoutStatusNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumWorkoutStatusNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => WorkoutStatusSchema).optional().nullable(),
  in: z.lazy(() => WorkoutStatusSchema).array().optional().nullable(),
  notIn: z.lazy(() => WorkoutStatusSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NestedEnumWorkoutStatusNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumWorkoutStatusNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumWorkoutStatusNullableFilterSchema).optional()
}).strict();

export const NestedEnumChangeTypeFilterSchema: z.ZodType<Prisma.NestedEnumChangeTypeFilter> = z.object({
  equals: z.lazy(() => ChangeTypeSchema).optional(),
  in: z.lazy(() => ChangeTypeSchema).array().optional(),
  notIn: z.lazy(() => ChangeTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NestedEnumChangeTypeFilterSchema) ]).optional(),
}).strict();

export const NestedEnumChangeTypeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumChangeTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ChangeTypeSchema).optional(),
  in: z.lazy(() => ChangeTypeSchema).array().optional(),
  notIn: z.lazy(() => ChangeTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NestedEnumChangeTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumChangeTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumChangeTypeFilterSchema).optional()
}).strict();

export const UserCreateWithoutExerciseSplitsInputSchema: z.ZodType<Prisma.UserCreateWithoutExerciseSplitsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutExerciseSplitsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutExerciseSplitsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutExerciseSplitsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutExerciseSplitsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutExerciseSplitsInputSchema),z.lazy(() => UserUncheckedCreateWithoutExerciseSplitsInputSchema) ]),
}).strict();

export const ExerciseSplitDayCreateWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayCreateWithoutExerciseSplitInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  exercises: z.lazy(() => ExerciseTemplateCreateNestedManyWithoutExerciseSplitDayInputSchema).optional()
}).strict();

export const ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  exercises: z.lazy(() => ExerciseTemplateUncheckedCreateNestedManyWithoutExerciseSplitDayInputSchema).optional()
}).strict();

export const ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayCreateOrConnectWithoutExerciseSplitInput> = z.object({
  where: z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema) ]),
}).strict();

export const ExerciseSplitDayCreateManyExerciseSplitInputEnvelopeSchema: z.ZodType<Prisma.ExerciseSplitDayCreateManyExerciseSplitInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ExerciseSplitDayCreateManyExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayCreateManyExerciseSplitInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const MesocycleCreateWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleCreateWithoutExerciseSplitInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  user: z.lazy(() => UserCreateNestedOneWithoutMesocycleInputSchema),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayCreateNestedManyWithoutMesocycleInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleUncheckedCreateWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleUncheckedCreateWithoutExerciseSplitInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleCreateOrConnectWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleCreateOrConnectWithoutExerciseSplitInput> = z.object({
  where: z.lazy(() => MesocycleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema) ]),
}).strict();

export const MesocycleCreateManyExerciseSplitInputEnvelopeSchema: z.ZodType<Prisma.MesocycleCreateManyExerciseSplitInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => MesocycleCreateManyExerciseSplitInputSchema),z.lazy(() => MesocycleCreateManyExerciseSplitInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const UserUpsertWithoutExerciseSplitsInputSchema: z.ZodType<Prisma.UserUpsertWithoutExerciseSplitsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutExerciseSplitsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutExerciseSplitsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutExerciseSplitsInputSchema),z.lazy(() => UserUncheckedCreateWithoutExerciseSplitsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutExerciseSplitsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutExerciseSplitsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutExerciseSplitsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutExerciseSplitsInputSchema) ]),
}).strict();

export const UserUpdateWithoutExerciseSplitsInputSchema: z.ZodType<Prisma.UserUpdateWithoutExerciseSplitsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutExerciseSplitsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutExerciseSplitsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const ExerciseSplitDayUpsertWithWhereUniqueWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpsertWithWhereUniqueWithoutExerciseSplitInput> = z.object({
  where: z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ExerciseSplitDayUpdateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUncheckedUpdateWithoutExerciseSplitInputSchema) ]),
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExerciseSplitInputSchema) ]),
}).strict();

export const ExerciseSplitDayUpdateWithWhereUniqueWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateWithWhereUniqueWithoutExerciseSplitInput> = z.object({
  where: z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ExerciseSplitDayUpdateWithoutExerciseSplitInputSchema),z.lazy(() => ExerciseSplitDayUncheckedUpdateWithoutExerciseSplitInputSchema) ]),
}).strict();

export const ExerciseSplitDayUpdateManyWithWhereWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateManyWithWhereWithoutExerciseSplitInput> = z.object({
  where: z.lazy(() => ExerciseSplitDayScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ExerciseSplitDayUpdateManyMutationInputSchema),z.lazy(() => ExerciseSplitDayUncheckedUpdateManyWithoutExerciseSplitInputSchema) ]),
}).strict();

export const ExerciseSplitDayScalarWhereInputSchema: z.ZodType<Prisma.ExerciseSplitDayScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ExerciseSplitDayScalarWhereInputSchema),z.lazy(() => ExerciseSplitDayScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseSplitDayScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseSplitDayScalarWhereInputSchema),z.lazy(() => ExerciseSplitDayScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  dayIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  isRestDay: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  exerciseSplitId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const MesocycleUpsertWithWhereUniqueWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleUpsertWithWhereUniqueWithoutExerciseSplitInput> = z.object({
  where: z.lazy(() => MesocycleWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MesocycleUpdateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutExerciseSplitInputSchema) ]),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutExerciseSplitInputSchema) ]),
}).strict();

export const MesocycleUpdateWithWhereUniqueWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleUpdateWithWhereUniqueWithoutExerciseSplitInput> = z.object({
  where: z.lazy(() => MesocycleWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MesocycleUpdateWithoutExerciseSplitInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutExerciseSplitInputSchema) ]),
}).strict();

export const MesocycleUpdateManyWithWhereWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleUpdateManyWithWhereWithoutExerciseSplitInput> = z.object({
  where: z.lazy(() => MesocycleScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MesocycleUpdateManyMutationInputSchema),z.lazy(() => MesocycleUncheckedUpdateManyWithoutExerciseSplitInputSchema) ]),
}).strict();

export const MesocycleScalarWhereInputSchema: z.ZodType<Prisma.MesocycleScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleScalarWhereInputSchema),z.lazy(() => MesocycleScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleScalarWhereInputSchema),z.lazy(() => MesocycleScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseSplitId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  RIRProgression: z.lazy(() => IntNullableListFilterSchema).optional(),
  startDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  endDate: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.lazy(() => FloatFilterSchema),z.number() ]).optional(),
  lastSetToFailure: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  forceRIRMatching: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
}).strict();

export const ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateCreateWithoutExerciseSplitDayInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable()
}).strict();

export const ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable()
}).strict();

export const ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateCreateOrConnectWithoutExerciseSplitDayInput> = z.object({
  where: z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema) ]),
}).strict();

export const ExerciseTemplateCreateManyExerciseSplitDayInputEnvelopeSchema: z.ZodType<Prisma.ExerciseTemplateCreateManyExerciseSplitDayInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ExerciseTemplateCreateManyExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateCreateManyExerciseSplitDayInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ExerciseSplitCreateWithoutExerciseSplitDaysInputSchema: z.ZodType<Prisma.ExerciseSplitCreateWithoutExerciseSplitDaysInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  user: z.lazy(() => UserCreateNestedOneWithoutExerciseSplitsInputSchema),
  usedByMesocycles: z.lazy(() => MesocycleCreateNestedManyWithoutExerciseSplitInputSchema).optional()
}).strict();

export const ExerciseSplitUncheckedCreateWithoutExerciseSplitDaysInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedCreateWithoutExerciseSplitDaysInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  usedByMesocycles: z.lazy(() => MesocycleUncheckedCreateNestedManyWithoutExerciseSplitInputSchema).optional()
}).strict();

export const ExerciseSplitCreateOrConnectWithoutExerciseSplitDaysInputSchema: z.ZodType<Prisma.ExerciseSplitCreateOrConnectWithoutExerciseSplitDaysInput> = z.object({
  where: z.lazy(() => ExerciseSplitWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutExerciseSplitDaysInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutExerciseSplitDaysInputSchema) ]),
}).strict();

export const ExerciseTemplateUpsertWithWhereUniqueWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateUpsertWithWhereUniqueWithoutExerciseSplitDayInput> = z.object({
  where: z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ExerciseTemplateUpdateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUncheckedUpdateWithoutExerciseSplitDayInputSchema) ]),
  create: z.union([ z.lazy(() => ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUncheckedCreateWithoutExerciseSplitDayInputSchema) ]),
}).strict();

export const ExerciseTemplateUpdateWithWhereUniqueWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateUpdateWithWhereUniqueWithoutExerciseSplitDayInput> = z.object({
  where: z.lazy(() => ExerciseTemplateWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ExerciseTemplateUpdateWithoutExerciseSplitDayInputSchema),z.lazy(() => ExerciseTemplateUncheckedUpdateWithoutExerciseSplitDayInputSchema) ]),
}).strict();

export const ExerciseTemplateUpdateManyWithWhereWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateUpdateManyWithWhereWithoutExerciseSplitDayInput> = z.object({
  where: z.lazy(() => ExerciseTemplateScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ExerciseTemplateUpdateManyMutationInputSchema),z.lazy(() => ExerciseTemplateUncheckedUpdateManyWithoutExerciseSplitDayInputSchema) ]),
}).strict();

export const ExerciseTemplateScalarWhereInputSchema: z.ZodType<Prisma.ExerciseTemplateScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ExerciseTemplateScalarWhereInputSchema),z.lazy(() => ExerciseTemplateScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseTemplateScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseTemplateScalarWhereInputSchema),z.lazy(() => ExerciseTemplateScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeNullableFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  note: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  exerciseSplitDayId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const ExerciseSplitUpsertWithoutExerciseSplitDaysInputSchema: z.ZodType<Prisma.ExerciseSplitUpsertWithoutExerciseSplitDaysInput> = z.object({
  update: z.union([ z.lazy(() => ExerciseSplitUpdateWithoutExerciseSplitDaysInputSchema),z.lazy(() => ExerciseSplitUncheckedUpdateWithoutExerciseSplitDaysInputSchema) ]),
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutExerciseSplitDaysInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutExerciseSplitDaysInputSchema) ]),
  where: z.lazy(() => ExerciseSplitWhereInputSchema).optional()
}).strict();

export const ExerciseSplitUpdateToOneWithWhereWithoutExerciseSplitDaysInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateToOneWithWhereWithoutExerciseSplitDaysInput> = z.object({
  where: z.lazy(() => ExerciseSplitWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ExerciseSplitUpdateWithoutExerciseSplitDaysInputSchema),z.lazy(() => ExerciseSplitUncheckedUpdateWithoutExerciseSplitDaysInputSchema) ]),
}).strict();

export const ExerciseSplitUpdateWithoutExerciseSplitDaysInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateWithoutExerciseSplitDaysInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutExerciseSplitsNestedInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleUpdateManyWithoutExerciseSplitNestedInputSchema).optional()
}).strict();

export const ExerciseSplitUncheckedUpdateWithoutExerciseSplitDaysInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedUpdateWithoutExerciseSplitDaysInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  usedByMesocycles: z.lazy(() => MesocycleUncheckedUpdateManyWithoutExerciseSplitNestedInputSchema).optional()
}).strict();

export const ExerciseSplitDayCreateWithoutExercisesInputSchema: z.ZodType<Prisma.ExerciseSplitDayCreateWithoutExercisesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  exerciseSplit: z.lazy(() => ExerciseSplitCreateNestedOneWithoutExerciseSplitDaysInputSchema)
}).strict();

export const ExerciseSplitDayUncheckedCreateWithoutExercisesInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedCreateWithoutExercisesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  exerciseSplitId: z.string()
}).strict();

export const ExerciseSplitDayCreateOrConnectWithoutExercisesInputSchema: z.ZodType<Prisma.ExerciseSplitDayCreateOrConnectWithoutExercisesInput> = z.object({
  where: z.lazy(() => ExerciseSplitDayWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExercisesInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExercisesInputSchema) ]),
}).strict();

export const ExerciseSplitDayUpsertWithoutExercisesInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpsertWithoutExercisesInput> = z.object({
  update: z.union([ z.lazy(() => ExerciseSplitDayUpdateWithoutExercisesInputSchema),z.lazy(() => ExerciseSplitDayUncheckedUpdateWithoutExercisesInputSchema) ]),
  create: z.union([ z.lazy(() => ExerciseSplitDayCreateWithoutExercisesInputSchema),z.lazy(() => ExerciseSplitDayUncheckedCreateWithoutExercisesInputSchema) ]),
  where: z.lazy(() => ExerciseSplitDayWhereInputSchema).optional()
}).strict();

export const ExerciseSplitDayUpdateToOneWithWhereWithoutExercisesInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateToOneWithWhereWithoutExercisesInput> = z.object({
  where: z.lazy(() => ExerciseSplitDayWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ExerciseSplitDayUpdateWithoutExercisesInputSchema),z.lazy(() => ExerciseSplitDayUncheckedUpdateWithoutExercisesInputSchema) ]),
}).strict();

export const ExerciseSplitDayUpdateWithoutExercisesInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateWithoutExercisesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitUpdateOneRequiredWithoutExerciseSplitDaysNestedInputSchema).optional()
}).strict();

export const ExerciseSplitDayUncheckedUpdateWithoutExercisesInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedUpdateWithoutExercisesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserCreateWithoutMesocycleInputSchema: z.ZodType<Prisma.UserCreateWithoutMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutMesocycleInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutMesocycleInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutMesocycleInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutMesocycleInputSchema),z.lazy(() => UserUncheckedCreateWithoutMesocycleInputSchema) ]),
}).strict();

export const ExerciseSplitCreateWithoutUsedByMesocyclesInputSchema: z.ZodType<Prisma.ExerciseSplitCreateWithoutUsedByMesocyclesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  user: z.lazy(() => UserCreateNestedOneWithoutExerciseSplitsInputSchema),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayCreateNestedManyWithoutExerciseSplitInputSchema).optional()
}).strict();

export const ExerciseSplitUncheckedCreateWithoutUsedByMesocyclesInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedCreateWithoutUsedByMesocyclesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayUncheckedCreateNestedManyWithoutExerciseSplitInputSchema).optional()
}).strict();

export const ExerciseSplitCreateOrConnectWithoutUsedByMesocyclesInputSchema: z.ZodType<Prisma.ExerciseSplitCreateOrConnectWithoutUsedByMesocyclesInput> = z.object({
  where: z.lazy(() => ExerciseSplitWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUsedByMesocyclesInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUsedByMesocyclesInputSchema) ]),
}).strict();

export const MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateWithoutMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateCreateNestedManyWithoutMesocycleExerciseSplitDayInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateUncheckedCreateNestedManyWithoutMesocycleExerciseSplitDayInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema) ]),
}).strict();

export const MesocycleExerciseSplitDayCreateManyMesocycleInputEnvelopeSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateManyMesocycleInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateManyMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayCreateManyMesocycleInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateWithoutMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  muscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  regardlessOfProgress: z.boolean(),
  setIncreaseAmount: z.number().int(),
  maxVolume: z.number().int()
}).strict();

export const MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  muscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  regardlessOfProgress: z.boolean(),
  setIncreaseAmount: z.number().int(),
  maxVolume: z.number().int()
}).strict();

export const MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateOrConnectWithoutMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema) ]),
}).strict();

export const MesocycleCyclicSetChangeCreateManyMesocycleInputEnvelopeSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateManyMesocycleInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateManyMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeCreateManyMesocycleInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const WorkoutOfMesocycleCreateWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateWithoutMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  splitDayName: z.string(),
  workoutStatus: z.lazy(() => WorkoutStatusSchema).optional().nullable(),
  workout: z.lazy(() => WorkoutCreateNestedOneWithoutWorkoutOfMesocycleInputSchema)
}).strict();

export const WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  workoutId: z.string(),
  splitDayName: z.string(),
  workoutStatus: z.lazy(() => WorkoutStatusSchema).optional().nullable()
}).strict();

export const WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateOrConnectWithoutMesocycleInput> = z.object({
  where: z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema) ]),
}).strict();

export const WorkoutOfMesocycleCreateManyMesocycleInputEnvelopeSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateManyMesocycleInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => WorkoutOfMesocycleCreateManyMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleCreateManyMesocycleInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const UserUpsertWithoutMesocycleInputSchema: z.ZodType<Prisma.UserUpsertWithoutMesocycleInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutMesocycleInputSchema),z.lazy(() => UserUncheckedUpdateWithoutMesocycleInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutMesocycleInputSchema),z.lazy(() => UserUncheckedCreateWithoutMesocycleInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutMesocycleInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutMesocycleInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutMesocycleInputSchema),z.lazy(() => UserUncheckedUpdateWithoutMesocycleInputSchema) ]),
}).strict();

export const UserUpdateWithoutMesocycleInputSchema: z.ZodType<Prisma.UserUpdateWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutMesocycleInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const ExerciseSplitUpsertWithoutUsedByMesocyclesInputSchema: z.ZodType<Prisma.ExerciseSplitUpsertWithoutUsedByMesocyclesInput> = z.object({
  update: z.union([ z.lazy(() => ExerciseSplitUpdateWithoutUsedByMesocyclesInputSchema),z.lazy(() => ExerciseSplitUncheckedUpdateWithoutUsedByMesocyclesInputSchema) ]),
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUsedByMesocyclesInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUsedByMesocyclesInputSchema) ]),
  where: z.lazy(() => ExerciseSplitWhereInputSchema).optional()
}).strict();

export const ExerciseSplitUpdateToOneWithWhereWithoutUsedByMesocyclesInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateToOneWithWhereWithoutUsedByMesocyclesInput> = z.object({
  where: z.lazy(() => ExerciseSplitWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ExerciseSplitUpdateWithoutUsedByMesocyclesInputSchema),z.lazy(() => ExerciseSplitUncheckedUpdateWithoutUsedByMesocyclesInputSchema) ]),
}).strict();

export const ExerciseSplitUpdateWithoutUsedByMesocyclesInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateWithoutUsedByMesocyclesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutExerciseSplitsNestedInputSchema).optional(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayUpdateManyWithoutExerciseSplitNestedInputSchema).optional()
}).strict();

export const ExerciseSplitUncheckedUpdateWithoutUsedByMesocyclesInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedUpdateWithoutUsedByMesocyclesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayUncheckedUpdateManyWithoutExerciseSplitNestedInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayUpsertWithWhereUniqueWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpsertWithWhereUniqueWithoutMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateWithoutMesocycleInputSchema) ]),
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleInputSchema) ]),
}).strict();

export const MesocycleExerciseSplitDayUpdateWithWhereUniqueWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateWithWhereUniqueWithoutMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateWithoutMesocycleInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateWithoutMesocycleInputSchema) ]),
}).strict();

export const MesocycleExerciseSplitDayUpdateManyWithWhereWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateManyWithWhereWithoutMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateManyMutationInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleInputSchema) ]),
}).strict();

export const MesocycleExerciseSplitDayScalarWhereInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema),z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema),z.lazy(() => MesocycleExerciseSplitDayScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  dayIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  isRestDay: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeUpsertWithWhereUniqueWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpsertWithWhereUniqueWithoutMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MesocycleCyclicSetChangeUpdateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUncheckedUpdateWithoutMesocycleInputSchema) ]),
  create: z.union([ z.lazy(() => MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateWithoutMesocycleInputSchema) ]),
}).strict();

export const MesocycleCyclicSetChangeUpdateWithWhereUniqueWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpdateWithWhereUniqueWithoutMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleCyclicSetChangeWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MesocycleCyclicSetChangeUpdateWithoutMesocycleInputSchema),z.lazy(() => MesocycleCyclicSetChangeUncheckedUpdateWithoutMesocycleInputSchema) ]),
}).strict();

export const MesocycleCyclicSetChangeUpdateManyWithWhereWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpdateManyWithWhereWithoutMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MesocycleCyclicSetChangeUpdateManyMutationInputSchema),z.lazy(() => MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleInputSchema) ]),
}).strict();

export const MesocycleCyclicSetChangeScalarWhereInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema),z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema),z.lazy(() => MesocycleCyclicSetChangeScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  muscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  setIncreaseAmount: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  maxVolume: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
}).strict();

export const WorkoutOfMesocycleUpsertWithWhereUniqueWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpsertWithWhereUniqueWithoutMesocycleInput> = z.object({
  where: z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedUpdateWithoutMesocycleInputSchema) ]),
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutMesocycleInputSchema) ]),
}).strict();

export const WorkoutOfMesocycleUpdateWithWhereUniqueWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateWithWhereUniqueWithoutMesocycleInput> = z.object({
  where: z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateWithoutMesocycleInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedUpdateWithoutMesocycleInputSchema) ]),
}).strict();

export const WorkoutOfMesocycleUpdateManyWithWhereWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateManyWithWhereWithoutMesocycleInput> = z.object({
  where: z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema),
  data: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateManyMutationInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleInputSchema) ]),
}).strict();

export const WorkoutOfMesocycleScalarWhereInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema),z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema),z.lazy(() => WorkoutOfMesocycleScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  workoutId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  mesocycleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  splitDayName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  workoutStatus: z.union([ z.lazy(() => EnumWorkoutStatusNullableFilterSchema),z.lazy(() => WorkoutStatusSchema) ]).optional().nullable(),
}).strict();

export const MesocycleCreateWithoutMesocycleCyclicSetChangesInputSchema: z.ZodType<Prisma.MesocycleCreateWithoutMesocycleCyclicSetChangesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  user: z.lazy(() => UserCreateNestedOneWithoutMesocycleInputSchema),
  exerciseSplit: z.lazy(() => ExerciseSplitCreateNestedOneWithoutUsedByMesocyclesInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleUncheckedCreateWithoutMesocycleCyclicSetChangesInputSchema: z.ZodType<Prisma.MesocycleUncheckedCreateWithoutMesocycleCyclicSetChangesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  exerciseSplitId: z.string().optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleCreateOrConnectWithoutMesocycleCyclicSetChangesInputSchema: z.ZodType<Prisma.MesocycleCreateOrConnectWithoutMesocycleCyclicSetChangesInput> = z.object({
  where: z.lazy(() => MesocycleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutMesocycleCyclicSetChangesInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutMesocycleCyclicSetChangesInputSchema) ]),
}).strict();

export const MesocycleUpsertWithoutMesocycleCyclicSetChangesInputSchema: z.ZodType<Prisma.MesocycleUpsertWithoutMesocycleCyclicSetChangesInput> = z.object({
  update: z.union([ z.lazy(() => MesocycleUpdateWithoutMesocycleCyclicSetChangesInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutMesocycleCyclicSetChangesInputSchema) ]),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutMesocycleCyclicSetChangesInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutMesocycleCyclicSetChangesInputSchema) ]),
  where: z.lazy(() => MesocycleWhereInputSchema).optional()
}).strict();

export const MesocycleUpdateToOneWithWhereWithoutMesocycleCyclicSetChangesInputSchema: z.ZodType<Prisma.MesocycleUpdateToOneWithWhereWithoutMesocycleCyclicSetChangesInput> = z.object({
  where: z.lazy(() => MesocycleWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MesocycleUpdateWithoutMesocycleCyclicSetChangesInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutMesocycleCyclicSetChangesInputSchema) ]),
}).strict();

export const MesocycleUpdateWithoutMesocycleCyclicSetChangesInputSchema: z.ZodType<Prisma.MesocycleUpdateWithoutMesocycleCyclicSetChangesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMesocycleNestedInputSchema).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitUpdateOneWithoutUsedByMesocyclesNestedInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleUncheckedUpdateWithoutMesocycleCyclicSetChangesInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateWithoutMesocycleCyclicSetChangesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleCreateWithoutMesocycleExerciseSplitDaysInputSchema: z.ZodType<Prisma.MesocycleCreateWithoutMesocycleExerciseSplitDaysInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  user: z.lazy(() => UserCreateNestedOneWithoutMesocycleInputSchema),
  exerciseSplit: z.lazy(() => ExerciseSplitCreateNestedOneWithoutUsedByMesocyclesInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleUncheckedCreateWithoutMesocycleExerciseSplitDaysInputSchema: z.ZodType<Prisma.MesocycleUncheckedCreateWithoutMesocycleExerciseSplitDaysInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  exerciseSplitId: z.string().optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleCreateOrConnectWithoutMesocycleExerciseSplitDaysInputSchema: z.ZodType<Prisma.MesocycleCreateOrConnectWithoutMesocycleExerciseSplitDaysInput> = z.object({
  where: z.lazy(() => MesocycleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutMesocycleExerciseSplitDaysInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutMesocycleExerciseSplitDaysInputSchema) ]),
}).strict();

export const MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  sets: z.number().int(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable()
}).strict();

export const MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  sets: z.number().int(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable()
}).strict();

export const MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateOrConnectWithoutMesocycleExerciseSplitDayInput> = z.object({
  where: z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema) ]),
}).strict();

export const MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInputEnvelopeSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const MesocycleUpsertWithoutMesocycleExerciseSplitDaysInputSchema: z.ZodType<Prisma.MesocycleUpsertWithoutMesocycleExerciseSplitDaysInput> = z.object({
  update: z.union([ z.lazy(() => MesocycleUpdateWithoutMesocycleExerciseSplitDaysInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutMesocycleExerciseSplitDaysInputSchema) ]),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutMesocycleExerciseSplitDaysInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutMesocycleExerciseSplitDaysInputSchema) ]),
  where: z.lazy(() => MesocycleWhereInputSchema).optional()
}).strict();

export const MesocycleUpdateToOneWithWhereWithoutMesocycleExerciseSplitDaysInputSchema: z.ZodType<Prisma.MesocycleUpdateToOneWithWhereWithoutMesocycleExerciseSplitDaysInput> = z.object({
  where: z.lazy(() => MesocycleWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MesocycleUpdateWithoutMesocycleExerciseSplitDaysInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutMesocycleExerciseSplitDaysInputSchema) ]),
}).strict();

export const MesocycleUpdateWithoutMesocycleExerciseSplitDaysInputSchema: z.ZodType<Prisma.MesocycleUpdateWithoutMesocycleExerciseSplitDaysInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMesocycleNestedInputSchema).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitUpdateOneWithoutUsedByMesocyclesNestedInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleUncheckedUpdateWithoutMesocycleExerciseSplitDaysInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateWithoutMesocycleExerciseSplitDaysInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleExerciseTemplateUpsertWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpsertWithWhereUniqueWithoutMesocycleExerciseSplitDayInput> = z.object({
  where: z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MesocycleExerciseTemplateUpdateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUncheckedUpdateWithoutMesocycleExerciseSplitDayInputSchema) ]),
  create: z.union([ z.lazy(() => MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUncheckedCreateWithoutMesocycleExerciseSplitDayInputSchema) ]),
}).strict();

export const MesocycleExerciseTemplateUpdateWithWhereUniqueWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpdateWithWhereUniqueWithoutMesocycleExerciseSplitDayInput> = z.object({
  where: z.lazy(() => MesocycleExerciseTemplateWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MesocycleExerciseTemplateUpdateWithoutMesocycleExerciseSplitDayInputSchema),z.lazy(() => MesocycleExerciseTemplateUncheckedUpdateWithoutMesocycleExerciseSplitDayInputSchema) ]),
}).strict();

export const MesocycleExerciseTemplateUpdateManyWithWhereWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpdateManyWithWhereWithoutMesocycleExerciseSplitDayInput> = z.object({
  where: z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MesocycleExerciseTemplateUpdateManyMutationInputSchema),z.lazy(() => MesocycleExerciseTemplateUncheckedUpdateManyWithoutMesocycleExerciseSplitDayInputSchema) ]),
}).strict();

export const MesocycleExerciseTemplateScalarWhereInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema),z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema),z.lazy(() => MesocycleExerciseTemplateScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  sets: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  setType: z.union([ z.lazy(() => EnumSetTypeFilterSchema),z.lazy(() => SetTypeSchema) ]).optional(),
  repRangeStart: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  repRangeEnd: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  changeType: z.union([ z.lazy(() => EnumChangeTypeNullableFilterSchema),z.lazy(() => ChangeTypeSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  note: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  mesocycleExerciseSplitDayId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableNullableFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  lastSetToFailure: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  forceRIRMatching: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
}).strict();

export const MesocycleExerciseSplitDayCreateWithoutMesocycleSplitDayExercisesInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateWithoutMesocycleSplitDayExercisesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  mesocycle: z.lazy(() => MesocycleCreateNestedOneWithoutMesocycleExerciseSplitDaysInputSchema)
}).strict();

export const MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleSplitDayExercisesInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleSplitDayExercisesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean(),
  mesocycleId: z.string()
}).strict();

export const MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleSplitDayExercisesInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateOrConnectWithoutMesocycleSplitDayExercisesInput> = z.object({
  where: z.lazy(() => MesocycleExerciseSplitDayWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleSplitDayExercisesInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleSplitDayExercisesInputSchema) ]),
}).strict();

export const MesocycleExerciseSplitDayUpsertWithoutMesocycleSplitDayExercisesInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpsertWithoutMesocycleSplitDayExercisesInput> = z.object({
  update: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateWithoutMesocycleSplitDayExercisesInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateWithoutMesocycleSplitDayExercisesInputSchema) ]),
  create: z.union([ z.lazy(() => MesocycleExerciseSplitDayCreateWithoutMesocycleSplitDayExercisesInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateWithoutMesocycleSplitDayExercisesInputSchema) ]),
  where: z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayUpdateToOneWithWhereWithoutMesocycleSplitDayExercisesInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateToOneWithWhereWithoutMesocycleSplitDayExercisesInput> = z.object({
  where: z.lazy(() => MesocycleExerciseSplitDayWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MesocycleExerciseSplitDayUpdateWithoutMesocycleSplitDayExercisesInputSchema),z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateWithoutMesocycleSplitDayExercisesInputSchema) ]),
}).strict();

export const MesocycleExerciseSplitDayUpdateWithoutMesocycleSplitDayExercisesInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateWithoutMesocycleSplitDayExercisesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycle: z.lazy(() => MesocycleUpdateOneRequiredWithoutMesocycleExerciseSplitDaysNestedInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayUncheckedUpdateWithoutMesocycleSplitDayExercisesInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedUpdateWithoutMesocycleSplitDayExercisesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountCreateWithoutUserInputSchema: z.ZodType<Prisma.AccountCreateWithoutUserInput> = z.object({
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().optional().nullable(),
  access_token: z.string().optional().nullable(),
  expires_at: z.number().int().optional().nullable(),
  token_type: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  id_token: z.string().optional().nullable(),
  session_state: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const AccountUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedCreateWithoutUserInput> = z.object({
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().optional().nullable(),
  access_token: z.string().optional().nullable(),
  expires_at: z.number().int().optional().nullable(),
  token_type: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  id_token: z.string().optional().nullable(),
  session_state: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const AccountCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.AccountCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => AccountWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const AccountCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.AccountCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => AccountCreateManyUserInputSchema),z.lazy(() => AccountCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const SessionCreateWithoutUserInputSchema: z.ZodType<Prisma.SessionCreateWithoutUserInput> = z.object({
  sessionToken: z.string(),
  expires: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const SessionUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedCreateWithoutUserInput> = z.object({
  sessionToken: z.string(),
  expires: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const SessionCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.SessionCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => SessionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const SessionCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.SessionCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => SessionCreateManyUserInputSchema),z.lazy(() => SessionCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ExerciseSplitCreateWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayCreateNestedManyWithoutExerciseSplitInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleCreateNestedManyWithoutExerciseSplitInputSchema).optional()
}).strict();

export const ExerciseSplitUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayUncheckedCreateNestedManyWithoutExerciseSplitInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleUncheckedCreateNestedManyWithoutExerciseSplitInputSchema).optional()
}).strict();

export const ExerciseSplitCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => ExerciseSplitWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const ExerciseSplitCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.ExerciseSplitCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ExerciseSplitCreateManyUserInputSchema),z.lazy(() => ExerciseSplitCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const MesocycleCreateWithoutUserInputSchema: z.ZodType<Prisma.MesocycleCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  exerciseSplit: z.lazy(() => ExerciseSplitCreateNestedOneWithoutUsedByMesocyclesInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayCreateNestedManyWithoutMesocycleInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.MesocycleUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseSplitId: z.string().optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.MesocycleCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => MesocycleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutUserInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const MesocycleCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.MesocycleCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => MesocycleCreateManyUserInputSchema),z.lazy(() => MesocycleCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const WorkoutCreateWithoutUserInputSchema: z.ZodType<Prisma.WorkoutCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleCreateNestedOneWithoutWorkoutInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseCreateNestedManyWithoutWorkoutInputSchema).optional()
}).strict();

export const WorkoutUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.WorkoutUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedCreateNestedOneWithoutWorkoutInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseUncheckedCreateNestedManyWithoutWorkoutInputSchema).optional()
}).strict();

export const WorkoutCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.WorkoutCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => WorkoutWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WorkoutCreateWithoutUserInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const WorkoutCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.WorkoutCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => WorkoutCreateManyUserInputSchema),z.lazy(() => WorkoutCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const AccountUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AccountUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => AccountWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => AccountUpdateWithoutUserInputSchema),z.lazy(() => AccountUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => AccountCreateWithoutUserInputSchema),z.lazy(() => AccountUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const AccountUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.AccountUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => AccountWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => AccountUpdateWithoutUserInputSchema),z.lazy(() => AccountUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const AccountUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.AccountUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => AccountScalarWhereInputSchema),
  data: z.union([ z.lazy(() => AccountUpdateManyMutationInputSchema),z.lazy(() => AccountUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const AccountScalarWhereInputSchema: z.ZodType<Prisma.AccountScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => AccountScalarWhereInputSchema),z.lazy(() => AccountScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => AccountScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => AccountScalarWhereInputSchema),z.lazy(() => AccountScalarWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  type: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  provider: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  providerAccountId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  refresh_token: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  access_token: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  expires_at: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  token_type: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  scope: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  id_token: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  session_state: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const SessionUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.SessionUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => SessionWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => SessionUpdateWithoutUserInputSchema),z.lazy(() => SessionUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => SessionCreateWithoutUserInputSchema),z.lazy(() => SessionUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const SessionUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.SessionUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => SessionWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => SessionUpdateWithoutUserInputSchema),z.lazy(() => SessionUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const SessionUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.SessionUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => SessionScalarWhereInputSchema),
  data: z.union([ z.lazy(() => SessionUpdateManyMutationInputSchema),z.lazy(() => SessionUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const SessionScalarWhereInputSchema: z.ZodType<Prisma.SessionScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => SessionScalarWhereInputSchema),z.lazy(() => SessionScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => SessionScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => SessionScalarWhereInputSchema),z.lazy(() => SessionScalarWhereInputSchema).array() ]).optional(),
  sessionToken: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  expires: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const ExerciseSplitUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => ExerciseSplitWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ExerciseSplitUpdateWithoutUserInputSchema),z.lazy(() => ExerciseSplitUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => ExerciseSplitCreateWithoutUserInputSchema),z.lazy(() => ExerciseSplitUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const ExerciseSplitUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => ExerciseSplitWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ExerciseSplitUpdateWithoutUserInputSchema),z.lazy(() => ExerciseSplitUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const ExerciseSplitUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => ExerciseSplitScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ExerciseSplitUpdateManyMutationInputSchema),z.lazy(() => ExerciseSplitUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const ExerciseSplitScalarWhereInputSchema: z.ZodType<Prisma.ExerciseSplitScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ExerciseSplitScalarWhereInputSchema),z.lazy(() => ExerciseSplitScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExerciseSplitScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExerciseSplitScalarWhereInputSchema),z.lazy(() => ExerciseSplitScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const MesocycleUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.MesocycleUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => MesocycleWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MesocycleUpdateWithoutUserInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutUserInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const MesocycleUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.MesocycleUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => MesocycleWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MesocycleUpdateWithoutUserInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const MesocycleUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.MesocycleUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => MesocycleScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MesocycleUpdateManyMutationInputSchema),z.lazy(() => MesocycleUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const WorkoutUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.WorkoutUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => WorkoutWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => WorkoutUpdateWithoutUserInputSchema),z.lazy(() => WorkoutUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => WorkoutCreateWithoutUserInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const WorkoutUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.WorkoutUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => WorkoutWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => WorkoutUpdateWithoutUserInputSchema),z.lazy(() => WorkoutUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const WorkoutUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.WorkoutUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => WorkoutScalarWhereInputSchema),
  data: z.union([ z.lazy(() => WorkoutUpdateManyMutationInputSchema),z.lazy(() => WorkoutUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const WorkoutScalarWhereInputSchema: z.ZodType<Prisma.WorkoutScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => WorkoutScalarWhereInputSchema),z.lazy(() => WorkoutScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutScalarWhereInputSchema),z.lazy(() => WorkoutScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const UserCreateWithoutAccountsInputSchema: z.ZodType<Prisma.UserCreateWithoutAccountsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutAccountsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutAccountsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutAccountsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutAccountsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema),z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]),
}).strict();

export const UserUpsertWithoutAccountsInputSchema: z.ZodType<Prisma.UserUpsertWithoutAccountsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutAccountsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutAccountsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutAccountsInputSchema),z.lazy(() => UserUncheckedCreateWithoutAccountsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutAccountsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutAccountsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutAccountsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutAccountsInputSchema) ]),
}).strict();

export const UserUpdateWithoutAccountsInputSchema: z.ZodType<Prisma.UserUpdateWithoutAccountsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutAccountsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutAccountsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserCreateWithoutSessionsInputSchema: z.ZodType<Prisma.UserCreateWithoutSessionsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutSessionsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutSessionsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutSessionsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutSessionsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema),z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]),
}).strict();

export const UserUpsertWithoutSessionsInputSchema: z.ZodType<Prisma.UserUpsertWithoutSessionsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutSessionsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutSessionsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutSessionsInputSchema),z.lazy(() => UserUncheckedCreateWithoutSessionsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutSessionsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutSessionsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutSessionsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutSessionsInputSchema) ]),
}).strict();

export const UserUpdateWithoutSessionsInputSchema: z.ZodType<Prisma.UserUpdateWithoutSessionsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutSessionsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutSessionsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Workout: z.lazy(() => WorkoutUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const WorkoutCreateWithoutWorkoutOfMesocycleInputSchema: z.ZodType<Prisma.WorkoutCreateWithoutWorkoutOfMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutWorkoutInputSchema),
  workoutExercises: z.lazy(() => WorkoutExerciseCreateNestedManyWithoutWorkoutInputSchema).optional()
}).strict();

export const WorkoutUncheckedCreateWithoutWorkoutOfMesocycleInputSchema: z.ZodType<Prisma.WorkoutUncheckedCreateWithoutWorkoutOfMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  userId: z.string(),
  workoutExercises: z.lazy(() => WorkoutExerciseUncheckedCreateNestedManyWithoutWorkoutInputSchema).optional()
}).strict();

export const WorkoutCreateOrConnectWithoutWorkoutOfMesocycleInputSchema: z.ZodType<Prisma.WorkoutCreateOrConnectWithoutWorkoutOfMesocycleInput> = z.object({
  where: z.lazy(() => WorkoutWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WorkoutCreateWithoutWorkoutOfMesocycleInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutWorkoutOfMesocycleInputSchema) ]),
}).strict();

export const MesocycleCreateWithoutWorkoutsOfMesocycleInputSchema: z.ZodType<Prisma.MesocycleCreateWithoutWorkoutsOfMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  user: z.lazy(() => UserCreateNestedOneWithoutMesocycleInputSchema),
  exerciseSplit: z.lazy(() => ExerciseSplitCreateNestedOneWithoutUsedByMesocyclesInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayCreateNestedManyWithoutMesocycleInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleUncheckedCreateWithoutWorkoutsOfMesocycleInputSchema: z.ZodType<Prisma.MesocycleUncheckedCreateWithoutWorkoutsOfMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  exerciseSplitId: z.string().optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedCreateNestedManyWithoutMesocycleInputSchema).optional()
}).strict();

export const MesocycleCreateOrConnectWithoutWorkoutsOfMesocycleInputSchema: z.ZodType<Prisma.MesocycleCreateOrConnectWithoutWorkoutsOfMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutWorkoutsOfMesocycleInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutWorkoutsOfMesocycleInputSchema) ]),
}).strict();

export const WorkoutUpsertWithoutWorkoutOfMesocycleInputSchema: z.ZodType<Prisma.WorkoutUpsertWithoutWorkoutOfMesocycleInput> = z.object({
  update: z.union([ z.lazy(() => WorkoutUpdateWithoutWorkoutOfMesocycleInputSchema),z.lazy(() => WorkoutUncheckedUpdateWithoutWorkoutOfMesocycleInputSchema) ]),
  create: z.union([ z.lazy(() => WorkoutCreateWithoutWorkoutOfMesocycleInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutWorkoutOfMesocycleInputSchema) ]),
  where: z.lazy(() => WorkoutWhereInputSchema).optional()
}).strict();

export const WorkoutUpdateToOneWithWhereWithoutWorkoutOfMesocycleInputSchema: z.ZodType<Prisma.WorkoutUpdateToOneWithWhereWithoutWorkoutOfMesocycleInput> = z.object({
  where: z.lazy(() => WorkoutWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => WorkoutUpdateWithoutWorkoutOfMesocycleInputSchema),z.lazy(() => WorkoutUncheckedUpdateWithoutWorkoutOfMesocycleInputSchema) ]),
}).strict();

export const WorkoutUpdateWithoutWorkoutOfMesocycleInputSchema: z.ZodType<Prisma.WorkoutUpdateWithoutWorkoutOfMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutWorkoutNestedInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseUpdateManyWithoutWorkoutNestedInputSchema).optional()
}).strict();

export const WorkoutUncheckedUpdateWithoutWorkoutOfMesocycleInputSchema: z.ZodType<Prisma.WorkoutUncheckedUpdateWithoutWorkoutOfMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseUncheckedUpdateManyWithoutWorkoutNestedInputSchema).optional()
}).strict();

export const MesocycleUpsertWithoutWorkoutsOfMesocycleInputSchema: z.ZodType<Prisma.MesocycleUpsertWithoutWorkoutsOfMesocycleInput> = z.object({
  update: z.union([ z.lazy(() => MesocycleUpdateWithoutWorkoutsOfMesocycleInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutWorkoutsOfMesocycleInputSchema) ]),
  create: z.union([ z.lazy(() => MesocycleCreateWithoutWorkoutsOfMesocycleInputSchema),z.lazy(() => MesocycleUncheckedCreateWithoutWorkoutsOfMesocycleInputSchema) ]),
  where: z.lazy(() => MesocycleWhereInputSchema).optional()
}).strict();

export const MesocycleUpdateToOneWithWhereWithoutWorkoutsOfMesocycleInputSchema: z.ZodType<Prisma.MesocycleUpdateToOneWithWhereWithoutWorkoutsOfMesocycleInput> = z.object({
  where: z.lazy(() => MesocycleWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MesocycleUpdateWithoutWorkoutsOfMesocycleInputSchema),z.lazy(() => MesocycleUncheckedUpdateWithoutWorkoutsOfMesocycleInputSchema) ]),
}).strict();

export const MesocycleUpdateWithoutWorkoutsOfMesocycleInputSchema: z.ZodType<Prisma.MesocycleUpdateWithoutWorkoutsOfMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMesocycleNestedInputSchema).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitUpdateOneWithoutUsedByMesocyclesNestedInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleUncheckedUpdateWithoutWorkoutsOfMesocycleInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateWithoutWorkoutsOfMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const UserCreateWithoutWorkoutInputSchema: z.ZodType<Prisma.UserCreateWithoutWorkoutInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutWorkoutInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutWorkoutInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string().optional().nullable(),
  email: z.string(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutWorkoutInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutWorkoutInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutWorkoutInputSchema),z.lazy(() => UserUncheckedCreateWithoutWorkoutInputSchema) ]),
}).strict();

export const WorkoutOfMesocycleCreateWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateWithoutWorkoutInput> = z.object({
  id: z.string().cuid().optional(),
  splitDayName: z.string(),
  workoutStatus: z.lazy(() => WorkoutStatusSchema).optional().nullable(),
  mesocycle: z.lazy(() => MesocycleCreateNestedOneWithoutWorkoutsOfMesocycleInputSchema)
}).strict();

export const WorkoutOfMesocycleUncheckedCreateWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedCreateWithoutWorkoutInput> = z.object({
  id: z.string().cuid().optional(),
  mesocycleId: z.string(),
  splitDayName: z.string(),
  workoutStatus: z.lazy(() => WorkoutStatusSchema).optional().nullable()
}).strict();

export const WorkoutOfMesocycleCreateOrConnectWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateOrConnectWithoutWorkoutInput> = z.object({
  where: z.lazy(() => WorkoutOfMesocycleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutWorkoutInputSchema) ]),
}).strict();

export const WorkoutExerciseCreateWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseCreateWithoutWorkoutInput> = z.object({
  id: z.string().cuid().optional(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable(),
  minimumWeightChange: z.number().optional().nullable(),
  setData: z.lazy(() => SetsOfWorkoutExerciseCreateNestedOneWithoutWorkoutExerciseInputSchema)
}).strict();

export const WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedCreateWithoutWorkoutInput> = z.object({
  id: z.string().cuid().optional(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable(),
  minimumWeightChange: z.number().optional().nullable(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const WorkoutExerciseCreateOrConnectWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseCreateOrConnectWithoutWorkoutInput> = z.object({
  where: z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema) ]),
}).strict();

export const WorkoutExerciseCreateManyWorkoutInputEnvelopeSchema: z.ZodType<Prisma.WorkoutExerciseCreateManyWorkoutInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => WorkoutExerciseCreateManyWorkoutInputSchema),z.lazy(() => WorkoutExerciseCreateManyWorkoutInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const UserUpsertWithoutWorkoutInputSchema: z.ZodType<Prisma.UserUpsertWithoutWorkoutInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutWorkoutInputSchema),z.lazy(() => UserUncheckedUpdateWithoutWorkoutInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutWorkoutInputSchema),z.lazy(() => UserUncheckedCreateWithoutWorkoutInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutWorkoutInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutWorkoutInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutWorkoutInputSchema),z.lazy(() => UserUncheckedUpdateWithoutWorkoutInputSchema) ]),
}).strict();

export const UserUpdateWithoutWorkoutInputSchema: z.ZodType<Prisma.UserUpdateWithoutWorkoutInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutWorkoutInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutWorkoutInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  exerciseSplits: z.lazy(() => ExerciseSplitUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  Mesocycle: z.lazy(() => MesocycleUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleUpsertWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpsertWithoutWorkoutInput> = z.object({
  update: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedUpdateWithoutWorkoutInputSchema) ]),
  create: z.union([ z.lazy(() => WorkoutOfMesocycleCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedCreateWithoutWorkoutInputSchema) ]),
  where: z.lazy(() => WorkoutOfMesocycleWhereInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleUpdateToOneWithWhereWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateToOneWithWhereWithoutWorkoutInput> = z.object({
  where: z.lazy(() => WorkoutOfMesocycleWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => WorkoutOfMesocycleUpdateWithoutWorkoutInputSchema),z.lazy(() => WorkoutOfMesocycleUncheckedUpdateWithoutWorkoutInputSchema) ]),
}).strict();

export const WorkoutOfMesocycleUpdateWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateWithoutWorkoutInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  splitDayName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutStatus: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mesocycle: z.lazy(() => MesocycleUpdateOneRequiredWithoutWorkoutsOfMesocycleNestedInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleUncheckedUpdateWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedUpdateWithoutWorkoutInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  splitDayName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutStatus: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const WorkoutExerciseUpsertWithWhereUniqueWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseUpsertWithWhereUniqueWithoutWorkoutInput> = z.object({
  where: z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => WorkoutExerciseUpdateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUncheckedUpdateWithoutWorkoutInputSchema) ]),
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutWorkoutInputSchema) ]),
}).strict();

export const WorkoutExerciseUpdateWithWhereUniqueWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseUpdateWithWhereUniqueWithoutWorkoutInput> = z.object({
  where: z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => WorkoutExerciseUpdateWithoutWorkoutInputSchema),z.lazy(() => WorkoutExerciseUncheckedUpdateWithoutWorkoutInputSchema) ]),
}).strict();

export const WorkoutExerciseUpdateManyWithWhereWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseUpdateManyWithWhereWithoutWorkoutInput> = z.object({
  where: z.lazy(() => WorkoutExerciseScalarWhereInputSchema),
  data: z.union([ z.lazy(() => WorkoutExerciseUpdateManyMutationInputSchema),z.lazy(() => WorkoutExerciseUncheckedUpdateManyWithoutWorkoutInputSchema) ]),
}).strict();

export const WorkoutExerciseScalarWhereInputSchema: z.ZodType<Prisma.WorkoutExerciseScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => WorkoutExerciseScalarWhereInputSchema),z.lazy(() => WorkoutExerciseScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WorkoutExerciseScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WorkoutExerciseScalarWhereInputSchema),z.lazy(() => WorkoutExerciseScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  exerciseIndex: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  workoutId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => EnumMuscleGroupFilterSchema),z.lazy(() => MuscleGroupSchema) ]).optional(),
  customMuscleGroup: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  involvesBodyweight: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  note: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => EnumProgressionVariableNullableFilterSchema),z.lazy(() => ProgressionVariableSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  lastSetToFailure: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  forceRIRMatching: z.union([ z.lazy(() => BoolNullableFilterSchema),z.boolean() ]).optional().nullable(),
  minimumWeightChange: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  setsOfWorkoutExerciseId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const WorkoutCreateWithoutWorkoutExercisesInputSchema: z.ZodType<Prisma.WorkoutCreateWithoutWorkoutExercisesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutWorkoutInputSchema),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleCreateNestedOneWithoutWorkoutInputSchema).optional()
}).strict();

export const WorkoutUncheckedCreateWithoutWorkoutExercisesInputSchema: z.ZodType<Prisma.WorkoutUncheckedCreateWithoutWorkoutExercisesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
  userId: z.string(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedCreateNestedOneWithoutWorkoutInputSchema).optional()
}).strict();

export const WorkoutCreateOrConnectWithoutWorkoutExercisesInputSchema: z.ZodType<Prisma.WorkoutCreateOrConnectWithoutWorkoutExercisesInput> = z.object({
  where: z.lazy(() => WorkoutWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WorkoutCreateWithoutWorkoutExercisesInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutWorkoutExercisesInputSchema) ]),
}).strict();

export const SetsOfWorkoutExerciseCreateWithoutWorkoutExerciseInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateWithoutWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  straightSets: z.lazy(() => StraightSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedCreateWithoutWorkoutExerciseInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedCreateWithoutWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  straightSets: z.lazy(() => StraightSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateOrConnectWithoutWorkoutExerciseInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateOrConnectWithoutWorkoutExerciseInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutWorkoutExerciseInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutWorkoutExerciseInputSchema) ]),
}).strict();

export const WorkoutUpsertWithoutWorkoutExercisesInputSchema: z.ZodType<Prisma.WorkoutUpsertWithoutWorkoutExercisesInput> = z.object({
  update: z.union([ z.lazy(() => WorkoutUpdateWithoutWorkoutExercisesInputSchema),z.lazy(() => WorkoutUncheckedUpdateWithoutWorkoutExercisesInputSchema) ]),
  create: z.union([ z.lazy(() => WorkoutCreateWithoutWorkoutExercisesInputSchema),z.lazy(() => WorkoutUncheckedCreateWithoutWorkoutExercisesInputSchema) ]),
  where: z.lazy(() => WorkoutWhereInputSchema).optional()
}).strict();

export const WorkoutUpdateToOneWithWhereWithoutWorkoutExercisesInputSchema: z.ZodType<Prisma.WorkoutUpdateToOneWithWhereWithoutWorkoutExercisesInput> = z.object({
  where: z.lazy(() => WorkoutWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => WorkoutUpdateWithoutWorkoutExercisesInputSchema),z.lazy(() => WorkoutUncheckedUpdateWithoutWorkoutExercisesInputSchema) ]),
}).strict();

export const WorkoutUpdateWithoutWorkoutExercisesInputSchema: z.ZodType<Prisma.WorkoutUpdateWithoutWorkoutExercisesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutWorkoutNestedInputSchema).optional(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleUpdateOneWithoutWorkoutNestedInputSchema).optional()
}).strict();

export const WorkoutUncheckedUpdateWithoutWorkoutExercisesInputSchema: z.ZodType<Prisma.WorkoutUncheckedUpdateWithoutWorkoutExercisesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedUpdateOneWithoutWorkoutNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUpsertWithoutWorkoutExerciseInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpsertWithoutWorkoutExerciseInput> = z.object({
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutWorkoutExerciseInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutWorkoutExerciseInputSchema) ]),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutWorkoutExerciseInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutWorkoutExerciseInputSchema) ]),
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutWorkoutExerciseInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutWorkoutExerciseInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutWorkoutExerciseInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutWorkoutExerciseInputSchema) ]),
}).strict();

export const SetsOfWorkoutExerciseUpdateWithoutWorkoutExerciseInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateWithoutWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  straightSets: z.lazy(() => StraightSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedUpdateWithoutWorkoutExerciseInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedUpdateWithoutWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  straightSets: z.lazy(() => StraightSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const WorkoutExerciseCreateWithoutSetDataInputSchema: z.ZodType<Prisma.WorkoutExerciseCreateWithoutSetDataInput> = z.object({
  id: z.string().cuid().optional(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable(),
  minimumWeightChange: z.number().optional().nullable(),
  workout: z.lazy(() => WorkoutCreateNestedOneWithoutWorkoutExercisesInputSchema)
}).strict();

export const WorkoutExerciseUncheckedCreateWithoutSetDataInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedCreateWithoutSetDataInput> = z.object({
  id: z.string().cuid().optional(),
  exerciseIndex: z.number().int(),
  workoutId: z.string(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable(),
  minimumWeightChange: z.number().optional().nullable()
}).strict();

export const WorkoutExerciseCreateOrConnectWithoutSetDataInputSchema: z.ZodType<Prisma.WorkoutExerciseCreateOrConnectWithoutSetDataInput> = z.object({
  where: z.lazy(() => WorkoutExerciseWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutSetDataInputSchema) ]),
}).strict();

export const StraightSetsCreateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.StraightSetsCreateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  load: z.number().int(),
  repNumbers: z.union([ z.lazy(() => StraightSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const StraightSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.StraightSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  load: z.number().int(),
  repNumbers: z.union([ z.lazy(() => StraightSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const StraightSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.StraightSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInput> = z.object({
  where: z.lazy(() => StraightSetsWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => StraightSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]),
}).strict();

export const FixedChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.FixedChangeSetsCreateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.lazy(() => ChangeTypeSchema),
  changeAmount: z.number()
}).strict();

export const FixedChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.FixedChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.lazy(() => ChangeTypeSchema),
  changeAmount: z.number()
}).strict();

export const FixedChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.FixedChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInput> = z.object({
  where: z.lazy(() => FixedChangeSetsWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => FixedChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]),
}).strict();

export const VariableChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.VariableChangeSetsCreateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const VariableChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.VariableChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsCreaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsCreateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const VariableChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.VariableChangeSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInput> = z.object({
  where: z.lazy(() => VariableChangeSetsWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => VariableChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]),
}).strict();

export const MyorepMatchSetsCreateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.MyorepMatchSetsCreateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetCreateNestedManyWithoutMyorepMatchSetsInputSchema).optional()
}).strict();

export const MyorepMatchSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.MyorepMatchSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.string().cuid().optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetUncheckedCreateNestedManyWithoutMyorepMatchSetsInputSchema).optional()
}).strict();

export const MyorepMatchSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.MyorepMatchSetsCreateOrConnectWithoutSetsOfWorkoutExerciseInput> = z.object({
  where: z.lazy(() => MyorepMatchSetsWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]),
}).strict();

export const WorkoutExerciseUpsertWithoutSetDataInputSchema: z.ZodType<Prisma.WorkoutExerciseUpsertWithoutSetDataInput> = z.object({
  update: z.union([ z.lazy(() => WorkoutExerciseUpdateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedUpdateWithoutSetDataInputSchema) ]),
  create: z.union([ z.lazy(() => WorkoutExerciseCreateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedCreateWithoutSetDataInputSchema) ]),
  where: z.lazy(() => WorkoutExerciseWhereInputSchema).optional()
}).strict();

export const WorkoutExerciseUpdateToOneWithWhereWithoutSetDataInputSchema: z.ZodType<Prisma.WorkoutExerciseUpdateToOneWithWhereWithoutSetDataInput> = z.object({
  where: z.lazy(() => WorkoutExerciseWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => WorkoutExerciseUpdateWithoutSetDataInputSchema),z.lazy(() => WorkoutExerciseUncheckedUpdateWithoutSetDataInputSchema) ]),
}).strict();

export const WorkoutExerciseUpdateWithoutSetDataInputSchema: z.ZodType<Prisma.WorkoutExerciseUpdateWithoutSetDataInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  minimumWeightChange: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  workout: z.lazy(() => WorkoutUpdateOneRequiredWithoutWorkoutExercisesNestedInputSchema).optional()
}).strict();

export const WorkoutExerciseUncheckedUpdateWithoutSetDataInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedUpdateWithoutSetDataInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  minimumWeightChange: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const StraightSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.StraightSetsUpsertWithoutSetsOfWorkoutExerciseInput> = z.object({
  update: z.union([ z.lazy(() => StraightSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]),
  create: z.union([ z.lazy(() => StraightSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]),
  where: z.lazy(() => StraightSetsWhereInputSchema).optional()
}).strict();

export const StraightSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.StraightSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInput> = z.object({
  where: z.lazy(() => StraightSetsWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => StraightSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => StraightSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]),
}).strict();

export const StraightSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.StraightSetsUpdateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  load: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repNumbers: z.union([ z.lazy(() => StraightSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const StraightSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.StraightSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  load: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repNumbers: z.union([ z.lazy(() => StraightSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => StraightSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const FixedChangeSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.FixedChangeSetsUpsertWithoutSetsOfWorkoutExerciseInput> = z.object({
  update: z.union([ z.lazy(() => FixedChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]),
  create: z.union([ z.lazy(() => FixedChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]),
  where: z.lazy(() => FixedChangeSetsWhereInputSchema).optional()
}).strict();

export const FixedChangeSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.FixedChangeSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInput> = z.object({
  where: z.lazy(() => FixedChangeSetsWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => FixedChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => FixedChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]),
}).strict();

export const FixedChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.FixedChangeSetsUpdateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => EnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional(),
  changeAmount: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const FixedChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.FixedChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => FixedChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => EnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional(),
  changeAmount: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const VariableChangeSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.VariableChangeSetsUpsertWithoutSetsOfWorkoutExerciseInput> = z.object({
  update: z.union([ z.lazy(() => VariableChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]),
  create: z.union([ z.lazy(() => VariableChangeSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]),
  where: z.lazy(() => VariableChangeSetsWhereInputSchema).optional()
}).strict();

export const VariableChangeSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.VariableChangeSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInput> = z.object({
  where: z.lazy(() => VariableChangeSetsWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => VariableChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => VariableChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]),
}).strict();

export const VariableChangeSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.VariableChangeSetsUpdateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const VariableChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.VariableChangeSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateloadNumbersInputSchema),z.number().int().array() ]).optional(),
  repNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdaterepNumbersInputSchema),z.number().int().array() ]).optional(),
  RIRNumbers: z.union([ z.lazy(() => VariableChangeSetsUpdateRIRNumbersInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const MyorepMatchSetsUpsertWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpsertWithoutSetsOfWorkoutExerciseInput> = z.object({
  update: z.union([ z.lazy(() => MyorepMatchSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]),
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutSetsOfWorkoutExerciseInputSchema) ]),
  where: z.lazy(() => MyorepMatchSetsWhereInputSchema).optional()
}).strict();

export const MyorepMatchSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateToOneWithWhereWithoutSetsOfWorkoutExerciseInput> = z.object({
  where: z.lazy(() => MyorepMatchSetsWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MyorepMatchSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema),z.lazy(() => MyorepMatchSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema) ]),
}).strict();

export const MyorepMatchSetsUpdateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetUpdateManyWithoutMyorepMatchSetsNestedInputSchema).optional()
}).strict();

export const MyorepMatchSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInputSchema: z.ZodType<Prisma.MyorepMatchSetsUncheckedUpdateWithoutSetsOfWorkoutExerciseInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetUncheckedUpdateManyWithoutMyorepMatchSetsNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateWithoutStraightSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateWithoutStraightSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseCreateNestedOneWithoutSetDataInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedCreateWithoutStraightSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedCreateWithoutStraightSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedCreateNestedOneWithoutSetDataInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateOrConnectWithoutStraightSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateOrConnectWithoutStraightSetsInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutStraightSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutStraightSetsInputSchema) ]),
}).strict();

export const SetsOfWorkoutExerciseUpsertWithoutStraightSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpsertWithoutStraightSetsInput> = z.object({
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutStraightSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutStraightSetsInputSchema) ]),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutStraightSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutStraightSetsInputSchema) ]),
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutStraightSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutStraightSetsInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutStraightSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutStraightSetsInputSchema) ]),
}).strict();

export const SetsOfWorkoutExerciseUpdateWithoutStraightSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateWithoutStraightSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUpdateOneWithoutSetDataNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedUpdateWithoutStraightSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedUpdateWithoutStraightSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedUpdateOneWithoutSetDataNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateWithoutFixedChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateWithoutFixedChangeSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseCreateNestedOneWithoutSetDataInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedCreateWithoutFixedChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedCreateWithoutFixedChangeSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedCreateNestedOneWithoutSetDataInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateOrConnectWithoutFixedChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateOrConnectWithoutFixedChangeSetsInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutFixedChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutFixedChangeSetsInputSchema) ]),
}).strict();

export const SetsOfWorkoutExerciseUpsertWithoutFixedChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpsertWithoutFixedChangeSetsInput> = z.object({
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutFixedChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutFixedChangeSetsInputSchema) ]),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutFixedChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutFixedChangeSetsInputSchema) ]),
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutFixedChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutFixedChangeSetsInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutFixedChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutFixedChangeSetsInputSchema) ]),
}).strict();

export const SetsOfWorkoutExerciseUpdateWithoutFixedChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateWithoutFixedChangeSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUpdateOneWithoutSetDataNestedInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedUpdateWithoutFixedChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedUpdateWithoutFixedChangeSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedUpdateOneWithoutSetDataNestedInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateWithoutVariableChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateWithoutVariableChangeSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseCreateNestedOneWithoutSetDataInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedCreateWithoutVariableChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedCreateWithoutVariableChangeSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedCreateNestedOneWithoutSetDataInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateOrConnectWithoutVariableChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateOrConnectWithoutVariableChangeSetsInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutVariableChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutVariableChangeSetsInputSchema) ]),
}).strict();

export const SetsOfWorkoutExerciseUpsertWithoutVariableChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpsertWithoutVariableChangeSetsInput> = z.object({
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutVariableChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutVariableChangeSetsInputSchema) ]),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutVariableChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutVariableChangeSetsInputSchema) ]),
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutVariableChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutVariableChangeSetsInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutVariableChangeSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutVariableChangeSetsInputSchema) ]),
}).strict();

export const SetsOfWorkoutExerciseUpdateWithoutVariableChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateWithoutVariableChangeSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUpdateOneWithoutSetDataNestedInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedUpdateWithoutVariableChangeSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedUpdateWithoutVariableChangeSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedUpdateOneWithoutSetDataNestedInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  myorepMatchSets: z.lazy(() => MyorepMatchSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetCreateWithoutMyorepMatchSetsInput> = z.object({
  id: z.string().cuid().optional(),
  repNumber: z.number().int(),
  loadNumber: z.number().int(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetCreatemyorepsInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInput> = z.object({
  id: z.string().cuid().optional(),
  repNumber: z.number().int(),
  loadNumber: z.number().int(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetCreatemyorepsInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetCreateOrConnectWithoutMyorepMatchSetsInput> = z.object({
  where: z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]),
}).strict();

export const MyorepMatchSetCreateManyMyorepMatchSetsInputEnvelopeSchema: z.ZodType<Prisma.MyorepMatchSetCreateManyMyorepMatchSetsInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => MyorepMatchSetCreateManyMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetCreateManyMyorepMatchSetsInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const SetsOfWorkoutExerciseCreateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateWithoutMyorepMatchSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseCreateNestedOneWithoutSetDataInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedCreateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedCreateWithoutMyorepMatchSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedCreateNestedOneWithoutSetDataInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedCreateNestedOneWithoutSetsOfWorkoutExerciseInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseCreateOrConnectWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateOrConnectWithoutMyorepMatchSetsInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]),
}).strict();

export const MyorepMatchSetUpsertWithWhereUniqueWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetUpsertWithWhereUniqueWithoutMyorepMatchSetsInput> = z.object({
  where: z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MyorepMatchSetUpdateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUncheckedUpdateWithoutMyorepMatchSetsInputSchema) ]),
  create: z.union([ z.lazy(() => MyorepMatchSetCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]),
}).strict();

export const MyorepMatchSetUpdateWithWhereUniqueWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetUpdateWithWhereUniqueWithoutMyorepMatchSetsInput> = z.object({
  where: z.lazy(() => MyorepMatchSetWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MyorepMatchSetUpdateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetUncheckedUpdateWithoutMyorepMatchSetsInputSchema) ]),
}).strict();

export const MyorepMatchSetUpdateManyWithWhereWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetUpdateManyWithWhereWithoutMyorepMatchSetsInput> = z.object({
  where: z.lazy(() => MyorepMatchSetScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MyorepMatchSetUpdateManyMutationInputSchema),z.lazy(() => MyorepMatchSetUncheckedUpdateManyWithoutMyorepMatchSetsInputSchema) ]),
}).strict();

export const MyorepMatchSetScalarWhereInputSchema: z.ZodType<Prisma.MyorepMatchSetScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MyorepMatchSetScalarWhereInputSchema),z.lazy(() => MyorepMatchSetScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MyorepMatchSetScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MyorepMatchSetScalarWhereInputSchema),z.lazy(() => MyorepMatchSetScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  repNumber: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  loadNumber: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  myoreps: z.lazy(() => IntNullableListFilterSchema).optional(),
  myorepMatchSetsId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
}).strict();

export const SetsOfWorkoutExerciseUpsertWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpsertWithoutMyorepMatchSetsInput> = z.object({
  update: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutMyorepMatchSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutMyorepMatchSetsInputSchema) ]),
  create: z.union([ z.lazy(() => SetsOfWorkoutExerciseCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]),
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateToOneWithWhereWithoutMyorepMatchSetsInput> = z.object({
  where: z.lazy(() => SetsOfWorkoutExerciseWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => SetsOfWorkoutExerciseUpdateWithoutMyorepMatchSetsInputSchema),z.lazy(() => SetsOfWorkoutExerciseUncheckedUpdateWithoutMyorepMatchSetsInputSchema) ]),
}).strict();

export const SetsOfWorkoutExerciseUpdateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateWithoutMyorepMatchSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUpdateOneWithoutSetDataNestedInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const SetsOfWorkoutExerciseUncheckedUpdateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUncheckedUpdateWithoutMyorepMatchSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  workoutExercise: z.lazy(() => WorkoutExerciseUncheckedUpdateOneWithoutSetDataNestedInputSchema).optional(),
  straightSets: z.lazy(() => StraightSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  fixedChangeSets: z.lazy(() => FixedChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional(),
  variableChangeSets: z.lazy(() => VariableChangeSetsUncheckedUpdateOneWithoutSetsOfWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const MyorepMatchSetsCreateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetsCreateWithoutMyorepMatchSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseCreateNestedOneWithoutMyorepMatchSetsInputSchema)
}).strict();

export const MyorepMatchSetsUncheckedCreateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetsUncheckedCreateWithoutMyorepMatchSetsInput> = z.object({
  id: z.string().cuid().optional(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const MyorepMatchSetsCreateOrConnectWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetsCreateOrConnectWithoutMyorepMatchSetsInput> = z.object({
  where: z.lazy(() => MyorepMatchSetsWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]),
}).strict();

export const MyorepMatchSetsUpsertWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpsertWithoutMyorepMatchSetsInput> = z.object({
  update: z.union([ z.lazy(() => MyorepMatchSetsUpdateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetsUncheckedUpdateWithoutMyorepMatchSetsInputSchema) ]),
  create: z.union([ z.lazy(() => MyorepMatchSetsCreateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetsUncheckedCreateWithoutMyorepMatchSetsInputSchema) ]),
  where: z.lazy(() => MyorepMatchSetsWhereInputSchema).optional()
}).strict();

export const MyorepMatchSetsUpdateToOneWithWhereWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateToOneWithWhereWithoutMyorepMatchSetsInput> = z.object({
  where: z.lazy(() => MyorepMatchSetsWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => MyorepMatchSetsUpdateWithoutMyorepMatchSetsInputSchema),z.lazy(() => MyorepMatchSetsUncheckedUpdateWithoutMyorepMatchSetsInputSchema) ]),
}).strict();

export const MyorepMatchSetsUpdateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateWithoutMyorepMatchSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setsOfWorkoutExercise: z.lazy(() => SetsOfWorkoutExerciseUpdateOneRequiredWithoutMyorepMatchSetsNestedInputSchema).optional()
}).strict();

export const MyorepMatchSetsUncheckedUpdateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetsUncheckedUpdateWithoutMyorepMatchSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ExerciseSplitDayCreateManyExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayCreateManyExerciseSplitInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean()
}).strict();

export const MesocycleCreateManyExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleCreateManyExerciseSplitInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  userId: z.string(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean()
}).strict();

export const ExerciseSplitDayUpdateWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateWithoutExerciseSplitInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  exercises: z.lazy(() => ExerciseTemplateUpdateManyWithoutExerciseSplitDayNestedInputSchema).optional()
}).strict();

export const ExerciseSplitDayUncheckedUpdateWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedUpdateWithoutExerciseSplitInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  exercises: z.lazy(() => ExerciseTemplateUncheckedUpdateManyWithoutExerciseSplitDayNestedInputSchema).optional()
}).strict();

export const ExerciseSplitDayUncheckedUpdateManyWithoutExerciseSplitInputSchema: z.ZodType<Prisma.ExerciseSplitDayUncheckedUpdateManyWithoutExerciseSplitInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleUpdateWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleUpdateWithoutExerciseSplitInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMesocycleNestedInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleUncheckedUpdateWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateWithoutExerciseSplitInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleUncheckedUpdateManyWithoutExerciseSplitInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateManyWithoutExerciseSplitInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ExerciseTemplateCreateManyExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateCreateManyExerciseSplitDayInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable()
}).strict();

export const ExerciseTemplateUpdateWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateUpdateWithoutExerciseSplitDayInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const ExerciseTemplateUncheckedUpdateWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateUncheckedUpdateWithoutExerciseSplitDayInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const ExerciseTemplateUncheckedUpdateManyWithoutExerciseSplitDayInputSchema: z.ZodType<Prisma.ExerciseTemplateUncheckedUpdateManyWithoutExerciseSplitDayInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const MesocycleExerciseSplitDayCreateManyMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateManyMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  dayIndex: z.number().int(),
  isRestDay: z.boolean()
}).strict();

export const MesocycleCyclicSetChangeCreateManyMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateManyMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  muscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  regardlessOfProgress: z.boolean(),
  setIncreaseAmount: z.number().int(),
  maxVolume: z.number().int()
}).strict();

export const WorkoutOfMesocycleCreateManyMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateManyMesocycleInput> = z.object({
  id: z.string().cuid().optional(),
  workoutId: z.string(),
  splitDayName: z.string(),
  workoutStatus: z.lazy(() => WorkoutStatusSchema).optional().nullable()
}).strict();

export const MesocycleExerciseSplitDayUpdateWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateUpdateManyWithoutMesocycleExerciseSplitDayNestedInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayUncheckedUpdateWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedUpdateWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleSplitDayExercises: z.lazy(() => MesocycleExerciseTemplateUncheckedUpdateManyWithoutMesocycleExerciseSplitDayNestedInputSchema).optional()
}).strict();

export const MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  dayIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  isRestDay: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeUpdateWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpdateWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  muscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setIncreaseAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  maxVolume: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeUncheckedUpdateWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUncheckedUpdateWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  muscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setIncreaseAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  maxVolume: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleInputSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  muscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  regardlessOfProgress: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  setIncreaseAmount: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  maxVolume: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WorkoutOfMesocycleUpdateWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  splitDayName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutStatus: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  workout: z.lazy(() => WorkoutUpdateOneRequiredWithoutWorkoutOfMesocycleNestedInputSchema).optional()
}).strict();

export const WorkoutOfMesocycleUncheckedUpdateWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedUpdateWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  splitDayName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutStatus: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleInputSchema: z.ZodType<Prisma.WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  splitDayName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  workoutStatus: z.union([ z.lazy(() => WorkoutStatusSchema),z.lazy(() => NullableEnumWorkoutStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateManyMesocycleExerciseSplitDayInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  sets: z.number().int(),
  setType: z.lazy(() => SetTypeSchema),
  repRangeStart: z.number().int(),
  repRangeEnd: z.number().int(),
  changeType: z.lazy(() => ChangeTypeSchema).optional().nullable(),
  changeAmount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable()
}).strict();

export const MesocycleExerciseTemplateUpdateWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpdateWithoutMesocycleExerciseSplitDayInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  sets: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const MesocycleExerciseTemplateUncheckedUpdateWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUncheckedUpdateWithoutMesocycleExerciseSplitDayInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  sets: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const MesocycleExerciseTemplateUncheckedUpdateManyWithoutMesocycleExerciseSplitDayInputSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUncheckedUpdateManyWithoutMesocycleExerciseSplitDayInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  sets: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  setType: z.union([ z.lazy(() => SetTypeSchema),z.lazy(() => EnumSetTypeFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeStart: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  repRangeEnd: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  changeType: z.union([ z.lazy(() => ChangeTypeSchema),z.lazy(() => NullableEnumChangeTypeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  changeAmount: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const AccountCreateManyUserInputSchema: z.ZodType<Prisma.AccountCreateManyUserInput> = z.object({
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().optional().nullable(),
  access_token: z.string().optional().nullable(),
  expires_at: z.number().int().optional().nullable(),
  token_type: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  id_token: z.string().optional().nullable(),
  session_state: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const SessionCreateManyUserInputSchema: z.ZodType<Prisma.SessionCreateManyUserInput> = z.object({
  sessionToken: z.string(),
  expires: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const ExerciseSplitCreateManyUserInputSchema: z.ZodType<Prisma.ExerciseSplitCreateManyUserInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string()
}).strict();

export const MesocycleCreateManyUserInputSchema: z.ZodType<Prisma.MesocycleCreateManyUserInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  exerciseSplitId: z.string().optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleCreateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema),
  startOverloadPercentage: z.number(),
  lastSetToFailure: z.boolean(),
  forceRIRMatching: z.boolean()
}).strict();

export const WorkoutCreateManyUserInputSchema: z.ZodType<Prisma.WorkoutCreateManyUserInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  createdAt: z.coerce.date().optional()
}).strict();

export const AccountUpdateWithoutUserInputSchema: z.ZodType<Prisma.AccountUpdateWithoutUserInput> = z.object({
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  provider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerAccountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  refresh_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  access_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  expires_at: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  token_type: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  id_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  session_state: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateWithoutUserInput> = z.object({
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  provider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerAccountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  refresh_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  access_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  expires_at: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  token_type: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  id_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  session_state: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const AccountUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.AccountUncheckedUpdateManyWithoutUserInput> = z.object({
  type: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  provider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  providerAccountId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  refresh_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  access_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  expires_at: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  token_type: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  scope: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  id_token: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  session_state: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionUpdateWithoutUserInputSchema: z.ZodType<Prisma.SessionUpdateWithoutUserInput> = z.object({
  sessionToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateWithoutUserInput> = z.object({
  sessionToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const SessionUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.SessionUncheckedUpdateManyWithoutUserInput> = z.object({
  sessionToken: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ExerciseSplitUpdateWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayUpdateManyWithoutExerciseSplitNestedInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleUpdateManyWithoutExerciseSplitNestedInputSchema).optional()
}).strict();

export const ExerciseSplitUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitDays: z.lazy(() => ExerciseSplitDayUncheckedUpdateManyWithoutExerciseSplitNestedInputSchema).optional(),
  usedByMesocycles: z.lazy(() => MesocycleUncheckedUpdateManyWithoutExerciseSplitNestedInputSchema).optional()
}).strict();

export const ExerciseSplitUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.ExerciseSplitUncheckedUpdateManyWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MesocycleUpdateWithoutUserInputSchema: z.ZodType<Prisma.MesocycleUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplit: z.lazy(() => ExerciseSplitUpdateOneWithoutUsedByMesocyclesNestedInputSchema).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  mesocycleExerciseSplitDays: z.lazy(() => MesocycleExerciseSplitDayUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  mesocycleCyclicSetChanges: z.lazy(() => MesocycleCyclicSetChangeUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional(),
  workoutsOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedUpdateManyWithoutMesocycleNestedInputSchema).optional()
}).strict();

export const MesocycleUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.MesocycleUncheckedUpdateManyWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseSplitId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  RIRProgression: z.union([ z.lazy(() => MesocycleUpdateRIRProgressionInputSchema),z.number().int().array() ]).optional(),
  startDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  endDate: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => EnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional(),
  startOverloadPercentage: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WorkoutUpdateWithoutUserInputSchema: z.ZodType<Prisma.WorkoutUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleUpdateOneWithoutWorkoutNestedInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseUpdateManyWithoutWorkoutNestedInputSchema).optional()
}).strict();

export const WorkoutUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.WorkoutUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  workoutOfMesocycle: z.lazy(() => WorkoutOfMesocycleUncheckedUpdateOneWithoutWorkoutNestedInputSchema).optional(),
  workoutExercises: z.lazy(() => WorkoutExerciseUncheckedUpdateManyWithoutWorkoutNestedInputSchema).optional()
}).strict();

export const WorkoutUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.WorkoutUncheckedUpdateManyWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WorkoutExerciseCreateManyWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseCreateManyWorkoutInput> = z.object({
  id: z.string().cuid().optional(),
  exerciseIndex: z.number().int(),
  targetMuscleGroup: z.lazy(() => MuscleGroupSchema),
  customMuscleGroup: z.string().optional().nullable(),
  involvesBodyweight: z.boolean(),
  note: z.string().optional().nullable(),
  preferredProgressionVariable: z.lazy(() => ProgressionVariableSchema).optional().nullable(),
  overloadPercentage: z.number().optional().nullable(),
  lastSetToFailure: z.boolean().optional().nullable(),
  forceRIRMatching: z.boolean().optional().nullable(),
  minimumWeightChange: z.number().optional().nullable(),
  setsOfWorkoutExerciseId: z.string()
}).strict();

export const WorkoutExerciseUpdateWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseUpdateWithoutWorkoutInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  minimumWeightChange: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  setData: z.lazy(() => SetsOfWorkoutExerciseUpdateOneRequiredWithoutWorkoutExerciseNestedInputSchema).optional()
}).strict();

export const WorkoutExerciseUncheckedUpdateWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedUpdateWithoutWorkoutInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  minimumWeightChange: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WorkoutExerciseUncheckedUpdateManyWithoutWorkoutInputSchema: z.ZodType<Prisma.WorkoutExerciseUncheckedUpdateManyWithoutWorkoutInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  exerciseIndex: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  targetMuscleGroup: z.union([ z.lazy(() => MuscleGroupSchema),z.lazy(() => EnumMuscleGroupFieldUpdateOperationsInputSchema) ]).optional(),
  customMuscleGroup: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  involvesBodyweight: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  note: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  preferredProgressionVariable: z.union([ z.lazy(() => ProgressionVariableSchema),z.lazy(() => NullableEnumProgressionVariableFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  overloadPercentage: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSetToFailure: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  forceRIRMatching: z.union([ z.boolean(),z.lazy(() => NullableBoolFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  minimumWeightChange: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  setsOfWorkoutExerciseId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MyorepMatchSetCreateManyMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetCreateManyMyorepMatchSetsInput> = z.object({
  id: z.string().cuid().optional(),
  repNumber: z.number().int(),
  loadNumber: z.number().int(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetCreatemyorepsInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const MyorepMatchSetUpdateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetUpdateWithoutMyorepMatchSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  repNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetUpdatemyorepsInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const MyorepMatchSetUncheckedUpdateWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetUncheckedUpdateWithoutMyorepMatchSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  repNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetUpdatemyorepsInputSchema),z.number().int().array() ]).optional(),
}).strict();

export const MyorepMatchSetUncheckedUpdateManyWithoutMyorepMatchSetsInputSchema: z.ZodType<Prisma.MyorepMatchSetUncheckedUpdateManyWithoutMyorepMatchSetsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  repNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loadNumber: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  myoreps: z.union([ z.lazy(() => MyorepMatchSetUpdatemyorepsInputSchema),z.number().int().array() ]).optional(),
}).strict();

/////////////////////////////////////////
// ARGS
/////////////////////////////////////////

export const ExerciseSplitFindFirstArgsSchema: z.ZodType<Prisma.ExerciseSplitFindFirstArgs> = z.object({
  select: ExerciseSplitSelectSchema.optional(),
  include: ExerciseSplitIncludeSchema.optional(),
  where: ExerciseSplitWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitOrderByWithRelationInputSchema.array(),ExerciseSplitOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseSplitWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExerciseSplitScalarFieldEnumSchema,ExerciseSplitScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ExerciseSplitFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ExerciseSplitFindFirstOrThrowArgs> = z.object({
  select: ExerciseSplitSelectSchema.optional(),
  include: ExerciseSplitIncludeSchema.optional(),
  where: ExerciseSplitWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitOrderByWithRelationInputSchema.array(),ExerciseSplitOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseSplitWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExerciseSplitScalarFieldEnumSchema,ExerciseSplitScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ExerciseSplitFindManyArgsSchema: z.ZodType<Prisma.ExerciseSplitFindManyArgs> = z.object({
  select: ExerciseSplitSelectSchema.optional(),
  include: ExerciseSplitIncludeSchema.optional(),
  where: ExerciseSplitWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitOrderByWithRelationInputSchema.array(),ExerciseSplitOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseSplitWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExerciseSplitScalarFieldEnumSchema,ExerciseSplitScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ExerciseSplitAggregateArgsSchema: z.ZodType<Prisma.ExerciseSplitAggregateArgs> = z.object({
  where: ExerciseSplitWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitOrderByWithRelationInputSchema.array(),ExerciseSplitOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseSplitWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ExerciseSplitGroupByArgsSchema: z.ZodType<Prisma.ExerciseSplitGroupByArgs> = z.object({
  where: ExerciseSplitWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitOrderByWithAggregationInputSchema.array(),ExerciseSplitOrderByWithAggregationInputSchema ]).optional(),
  by: ExerciseSplitScalarFieldEnumSchema.array(),
  having: ExerciseSplitScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ExerciseSplitFindUniqueArgsSchema: z.ZodType<Prisma.ExerciseSplitFindUniqueArgs> = z.object({
  select: ExerciseSplitSelectSchema.optional(),
  include: ExerciseSplitIncludeSchema.optional(),
  where: ExerciseSplitWhereUniqueInputSchema,
}).strict() ;

export const ExerciseSplitFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ExerciseSplitFindUniqueOrThrowArgs> = z.object({
  select: ExerciseSplitSelectSchema.optional(),
  include: ExerciseSplitIncludeSchema.optional(),
  where: ExerciseSplitWhereUniqueInputSchema,
}).strict() ;

export const ExerciseSplitDayFindFirstArgsSchema: z.ZodType<Prisma.ExerciseSplitDayFindFirstArgs> = z.object({
  select: ExerciseSplitDaySelectSchema.optional(),
  include: ExerciseSplitDayIncludeSchema.optional(),
  where: ExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitDayOrderByWithRelationInputSchema.array(),ExerciseSplitDayOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseSplitDayWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExerciseSplitDayScalarFieldEnumSchema,ExerciseSplitDayScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ExerciseSplitDayFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ExerciseSplitDayFindFirstOrThrowArgs> = z.object({
  select: ExerciseSplitDaySelectSchema.optional(),
  include: ExerciseSplitDayIncludeSchema.optional(),
  where: ExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitDayOrderByWithRelationInputSchema.array(),ExerciseSplitDayOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseSplitDayWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExerciseSplitDayScalarFieldEnumSchema,ExerciseSplitDayScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ExerciseSplitDayFindManyArgsSchema: z.ZodType<Prisma.ExerciseSplitDayFindManyArgs> = z.object({
  select: ExerciseSplitDaySelectSchema.optional(),
  include: ExerciseSplitDayIncludeSchema.optional(),
  where: ExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitDayOrderByWithRelationInputSchema.array(),ExerciseSplitDayOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseSplitDayWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExerciseSplitDayScalarFieldEnumSchema,ExerciseSplitDayScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ExerciseSplitDayAggregateArgsSchema: z.ZodType<Prisma.ExerciseSplitDayAggregateArgs> = z.object({
  where: ExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitDayOrderByWithRelationInputSchema.array(),ExerciseSplitDayOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseSplitDayWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ExerciseSplitDayGroupByArgsSchema: z.ZodType<Prisma.ExerciseSplitDayGroupByArgs> = z.object({
  where: ExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseSplitDayOrderByWithAggregationInputSchema.array(),ExerciseSplitDayOrderByWithAggregationInputSchema ]).optional(),
  by: ExerciseSplitDayScalarFieldEnumSchema.array(),
  having: ExerciseSplitDayScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ExerciseSplitDayFindUniqueArgsSchema: z.ZodType<Prisma.ExerciseSplitDayFindUniqueArgs> = z.object({
  select: ExerciseSplitDaySelectSchema.optional(),
  include: ExerciseSplitDayIncludeSchema.optional(),
  where: ExerciseSplitDayWhereUniqueInputSchema,
}).strict() ;

export const ExerciseSplitDayFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ExerciseSplitDayFindUniqueOrThrowArgs> = z.object({
  select: ExerciseSplitDaySelectSchema.optional(),
  include: ExerciseSplitDayIncludeSchema.optional(),
  where: ExerciseSplitDayWhereUniqueInputSchema,
}).strict() ;

export const ExerciseTemplateFindFirstArgsSchema: z.ZodType<Prisma.ExerciseTemplateFindFirstArgs> = z.object({
  select: ExerciseTemplateSelectSchema.optional(),
  include: ExerciseTemplateIncludeSchema.optional(),
  where: ExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseTemplateOrderByWithRelationInputSchema.array(),ExerciseTemplateOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseTemplateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExerciseTemplateScalarFieldEnumSchema,ExerciseTemplateScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ExerciseTemplateFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ExerciseTemplateFindFirstOrThrowArgs> = z.object({
  select: ExerciseTemplateSelectSchema.optional(),
  include: ExerciseTemplateIncludeSchema.optional(),
  where: ExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseTemplateOrderByWithRelationInputSchema.array(),ExerciseTemplateOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseTemplateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExerciseTemplateScalarFieldEnumSchema,ExerciseTemplateScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ExerciseTemplateFindManyArgsSchema: z.ZodType<Prisma.ExerciseTemplateFindManyArgs> = z.object({
  select: ExerciseTemplateSelectSchema.optional(),
  include: ExerciseTemplateIncludeSchema.optional(),
  where: ExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseTemplateOrderByWithRelationInputSchema.array(),ExerciseTemplateOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseTemplateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExerciseTemplateScalarFieldEnumSchema,ExerciseTemplateScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ExerciseTemplateAggregateArgsSchema: z.ZodType<Prisma.ExerciseTemplateAggregateArgs> = z.object({
  where: ExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseTemplateOrderByWithRelationInputSchema.array(),ExerciseTemplateOrderByWithRelationInputSchema ]).optional(),
  cursor: ExerciseTemplateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ExerciseTemplateGroupByArgsSchema: z.ZodType<Prisma.ExerciseTemplateGroupByArgs> = z.object({
  where: ExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ ExerciseTemplateOrderByWithAggregationInputSchema.array(),ExerciseTemplateOrderByWithAggregationInputSchema ]).optional(),
  by: ExerciseTemplateScalarFieldEnumSchema.array(),
  having: ExerciseTemplateScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ExerciseTemplateFindUniqueArgsSchema: z.ZodType<Prisma.ExerciseTemplateFindUniqueArgs> = z.object({
  select: ExerciseTemplateSelectSchema.optional(),
  include: ExerciseTemplateIncludeSchema.optional(),
  where: ExerciseTemplateWhereUniqueInputSchema,
}).strict() ;

export const ExerciseTemplateFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ExerciseTemplateFindUniqueOrThrowArgs> = z.object({
  select: ExerciseTemplateSelectSchema.optional(),
  include: ExerciseTemplateIncludeSchema.optional(),
  where: ExerciseTemplateWhereUniqueInputSchema,
}).strict() ;

export const MesocycleFindFirstArgsSchema: z.ZodType<Prisma.MesocycleFindFirstArgs> = z.object({
  select: MesocycleSelectSchema.optional(),
  include: MesocycleIncludeSchema.optional(),
  where: MesocycleWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleOrderByWithRelationInputSchema.array(),MesocycleOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleScalarFieldEnumSchema,MesocycleScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleFindFirstOrThrowArgsSchema: z.ZodType<Prisma.MesocycleFindFirstOrThrowArgs> = z.object({
  select: MesocycleSelectSchema.optional(),
  include: MesocycleIncludeSchema.optional(),
  where: MesocycleWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleOrderByWithRelationInputSchema.array(),MesocycleOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleScalarFieldEnumSchema,MesocycleScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleFindManyArgsSchema: z.ZodType<Prisma.MesocycleFindManyArgs> = z.object({
  select: MesocycleSelectSchema.optional(),
  include: MesocycleIncludeSchema.optional(),
  where: MesocycleWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleOrderByWithRelationInputSchema.array(),MesocycleOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleScalarFieldEnumSchema,MesocycleScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleAggregateArgsSchema: z.ZodType<Prisma.MesocycleAggregateArgs> = z.object({
  where: MesocycleWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleOrderByWithRelationInputSchema.array(),MesocycleOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MesocycleGroupByArgsSchema: z.ZodType<Prisma.MesocycleGroupByArgs> = z.object({
  where: MesocycleWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleOrderByWithAggregationInputSchema.array(),MesocycleOrderByWithAggregationInputSchema ]).optional(),
  by: MesocycleScalarFieldEnumSchema.array(),
  having: MesocycleScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MesocycleFindUniqueArgsSchema: z.ZodType<Prisma.MesocycleFindUniqueArgs> = z.object({
  select: MesocycleSelectSchema.optional(),
  include: MesocycleIncludeSchema.optional(),
  where: MesocycleWhereUniqueInputSchema,
}).strict() ;

export const MesocycleFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.MesocycleFindUniqueOrThrowArgs> = z.object({
  select: MesocycleSelectSchema.optional(),
  include: MesocycleIncludeSchema.optional(),
  where: MesocycleWhereUniqueInputSchema,
}).strict() ;

export const MesocycleCyclicSetChangeFindFirstArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeFindFirstArgs> = z.object({
  select: MesocycleCyclicSetChangeSelectSchema.optional(),
  include: MesocycleCyclicSetChangeIncludeSchema.optional(),
  where: MesocycleCyclicSetChangeWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleCyclicSetChangeOrderByWithRelationInputSchema.array(),MesocycleCyclicSetChangeOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleCyclicSetChangeWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleCyclicSetChangeScalarFieldEnumSchema,MesocycleCyclicSetChangeScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleCyclicSetChangeFindFirstOrThrowArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeFindFirstOrThrowArgs> = z.object({
  select: MesocycleCyclicSetChangeSelectSchema.optional(),
  include: MesocycleCyclicSetChangeIncludeSchema.optional(),
  where: MesocycleCyclicSetChangeWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleCyclicSetChangeOrderByWithRelationInputSchema.array(),MesocycleCyclicSetChangeOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleCyclicSetChangeWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleCyclicSetChangeScalarFieldEnumSchema,MesocycleCyclicSetChangeScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleCyclicSetChangeFindManyArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeFindManyArgs> = z.object({
  select: MesocycleCyclicSetChangeSelectSchema.optional(),
  include: MesocycleCyclicSetChangeIncludeSchema.optional(),
  where: MesocycleCyclicSetChangeWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleCyclicSetChangeOrderByWithRelationInputSchema.array(),MesocycleCyclicSetChangeOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleCyclicSetChangeWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleCyclicSetChangeScalarFieldEnumSchema,MesocycleCyclicSetChangeScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleCyclicSetChangeAggregateArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeAggregateArgs> = z.object({
  where: MesocycleCyclicSetChangeWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleCyclicSetChangeOrderByWithRelationInputSchema.array(),MesocycleCyclicSetChangeOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleCyclicSetChangeWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MesocycleCyclicSetChangeGroupByArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeGroupByArgs> = z.object({
  where: MesocycleCyclicSetChangeWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleCyclicSetChangeOrderByWithAggregationInputSchema.array(),MesocycleCyclicSetChangeOrderByWithAggregationInputSchema ]).optional(),
  by: MesocycleCyclicSetChangeScalarFieldEnumSchema.array(),
  having: MesocycleCyclicSetChangeScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MesocycleCyclicSetChangeFindUniqueArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeFindUniqueArgs> = z.object({
  select: MesocycleCyclicSetChangeSelectSchema.optional(),
  include: MesocycleCyclicSetChangeIncludeSchema.optional(),
  where: MesocycleCyclicSetChangeWhereUniqueInputSchema,
}).strict() ;

export const MesocycleCyclicSetChangeFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeFindUniqueOrThrowArgs> = z.object({
  select: MesocycleCyclicSetChangeSelectSchema.optional(),
  include: MesocycleCyclicSetChangeIncludeSchema.optional(),
  where: MesocycleCyclicSetChangeWhereUniqueInputSchema,
}).strict() ;

export const MesocycleExerciseSplitDayFindFirstArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayFindFirstArgs> = z.object({
  select: MesocycleExerciseSplitDaySelectSchema.optional(),
  include: MesocycleExerciseSplitDayIncludeSchema.optional(),
  where: MesocycleExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseSplitDayOrderByWithRelationInputSchema.array(),MesocycleExerciseSplitDayOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleExerciseSplitDayWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleExerciseSplitDayScalarFieldEnumSchema,MesocycleExerciseSplitDayScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleExerciseSplitDayFindFirstOrThrowArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayFindFirstOrThrowArgs> = z.object({
  select: MesocycleExerciseSplitDaySelectSchema.optional(),
  include: MesocycleExerciseSplitDayIncludeSchema.optional(),
  where: MesocycleExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseSplitDayOrderByWithRelationInputSchema.array(),MesocycleExerciseSplitDayOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleExerciseSplitDayWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleExerciseSplitDayScalarFieldEnumSchema,MesocycleExerciseSplitDayScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleExerciseSplitDayFindManyArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayFindManyArgs> = z.object({
  select: MesocycleExerciseSplitDaySelectSchema.optional(),
  include: MesocycleExerciseSplitDayIncludeSchema.optional(),
  where: MesocycleExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseSplitDayOrderByWithRelationInputSchema.array(),MesocycleExerciseSplitDayOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleExerciseSplitDayWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleExerciseSplitDayScalarFieldEnumSchema,MesocycleExerciseSplitDayScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleExerciseSplitDayAggregateArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayAggregateArgs> = z.object({
  where: MesocycleExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseSplitDayOrderByWithRelationInputSchema.array(),MesocycleExerciseSplitDayOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleExerciseSplitDayWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MesocycleExerciseSplitDayGroupByArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayGroupByArgs> = z.object({
  where: MesocycleExerciseSplitDayWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseSplitDayOrderByWithAggregationInputSchema.array(),MesocycleExerciseSplitDayOrderByWithAggregationInputSchema ]).optional(),
  by: MesocycleExerciseSplitDayScalarFieldEnumSchema.array(),
  having: MesocycleExerciseSplitDayScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MesocycleExerciseSplitDayFindUniqueArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayFindUniqueArgs> = z.object({
  select: MesocycleExerciseSplitDaySelectSchema.optional(),
  include: MesocycleExerciseSplitDayIncludeSchema.optional(),
  where: MesocycleExerciseSplitDayWhereUniqueInputSchema,
}).strict() ;

export const MesocycleExerciseSplitDayFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayFindUniqueOrThrowArgs> = z.object({
  select: MesocycleExerciseSplitDaySelectSchema.optional(),
  include: MesocycleExerciseSplitDayIncludeSchema.optional(),
  where: MesocycleExerciseSplitDayWhereUniqueInputSchema,
}).strict() ;

export const MesocycleExerciseTemplateFindFirstArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateFindFirstArgs> = z.object({
  select: MesocycleExerciseTemplateSelectSchema.optional(),
  include: MesocycleExerciseTemplateIncludeSchema.optional(),
  where: MesocycleExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseTemplateOrderByWithRelationInputSchema.array(),MesocycleExerciseTemplateOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleExerciseTemplateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleExerciseTemplateScalarFieldEnumSchema,MesocycleExerciseTemplateScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleExerciseTemplateFindFirstOrThrowArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateFindFirstOrThrowArgs> = z.object({
  select: MesocycleExerciseTemplateSelectSchema.optional(),
  include: MesocycleExerciseTemplateIncludeSchema.optional(),
  where: MesocycleExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseTemplateOrderByWithRelationInputSchema.array(),MesocycleExerciseTemplateOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleExerciseTemplateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleExerciseTemplateScalarFieldEnumSchema,MesocycleExerciseTemplateScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleExerciseTemplateFindManyArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateFindManyArgs> = z.object({
  select: MesocycleExerciseTemplateSelectSchema.optional(),
  include: MesocycleExerciseTemplateIncludeSchema.optional(),
  where: MesocycleExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseTemplateOrderByWithRelationInputSchema.array(),MesocycleExerciseTemplateOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleExerciseTemplateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MesocycleExerciseTemplateScalarFieldEnumSchema,MesocycleExerciseTemplateScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MesocycleExerciseTemplateAggregateArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateAggregateArgs> = z.object({
  where: MesocycleExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseTemplateOrderByWithRelationInputSchema.array(),MesocycleExerciseTemplateOrderByWithRelationInputSchema ]).optional(),
  cursor: MesocycleExerciseTemplateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MesocycleExerciseTemplateGroupByArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateGroupByArgs> = z.object({
  where: MesocycleExerciseTemplateWhereInputSchema.optional(),
  orderBy: z.union([ MesocycleExerciseTemplateOrderByWithAggregationInputSchema.array(),MesocycleExerciseTemplateOrderByWithAggregationInputSchema ]).optional(),
  by: MesocycleExerciseTemplateScalarFieldEnumSchema.array(),
  having: MesocycleExerciseTemplateScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MesocycleExerciseTemplateFindUniqueArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateFindUniqueArgs> = z.object({
  select: MesocycleExerciseTemplateSelectSchema.optional(),
  include: MesocycleExerciseTemplateIncludeSchema.optional(),
  where: MesocycleExerciseTemplateWhereUniqueInputSchema,
}).strict() ;

export const MesocycleExerciseTemplateFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateFindUniqueOrThrowArgs> = z.object({
  select: MesocycleExerciseTemplateSelectSchema.optional(),
  include: MesocycleExerciseTemplateIncludeSchema.optional(),
  where: MesocycleExerciseTemplateWhereUniqueInputSchema,
}).strict() ;

export const UserFindFirstArgsSchema: z.ZodType<Prisma.UserFindFirstArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const UserFindFirstOrThrowArgsSchema: z.ZodType<Prisma.UserFindFirstOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const UserFindManyArgsSchema: z.ZodType<Prisma.UserFindManyArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const UserAggregateArgsSchema: z.ZodType<Prisma.UserAggregateArgs> = z.object({
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const UserGroupByArgsSchema: z.ZodType<Prisma.UserGroupByArgs> = z.object({
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithAggregationInputSchema.array(),UserOrderByWithAggregationInputSchema ]).optional(),
  by: UserScalarFieldEnumSchema.array(),
  having: UserScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const UserFindUniqueArgsSchema: z.ZodType<Prisma.UserFindUniqueArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const UserFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.UserFindUniqueOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const AccountFindFirstArgsSchema: z.ZodType<Prisma.AccountFindFirstArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereInputSchema.optional(),
  orderBy: z.union([ AccountOrderByWithRelationInputSchema.array(),AccountOrderByWithRelationInputSchema ]).optional(),
  cursor: AccountWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AccountScalarFieldEnumSchema,AccountScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const AccountFindFirstOrThrowArgsSchema: z.ZodType<Prisma.AccountFindFirstOrThrowArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereInputSchema.optional(),
  orderBy: z.union([ AccountOrderByWithRelationInputSchema.array(),AccountOrderByWithRelationInputSchema ]).optional(),
  cursor: AccountWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AccountScalarFieldEnumSchema,AccountScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const AccountFindManyArgsSchema: z.ZodType<Prisma.AccountFindManyArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereInputSchema.optional(),
  orderBy: z.union([ AccountOrderByWithRelationInputSchema.array(),AccountOrderByWithRelationInputSchema ]).optional(),
  cursor: AccountWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ AccountScalarFieldEnumSchema,AccountScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const AccountAggregateArgsSchema: z.ZodType<Prisma.AccountAggregateArgs> = z.object({
  where: AccountWhereInputSchema.optional(),
  orderBy: z.union([ AccountOrderByWithRelationInputSchema.array(),AccountOrderByWithRelationInputSchema ]).optional(),
  cursor: AccountWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const AccountGroupByArgsSchema: z.ZodType<Prisma.AccountGroupByArgs> = z.object({
  where: AccountWhereInputSchema.optional(),
  orderBy: z.union([ AccountOrderByWithAggregationInputSchema.array(),AccountOrderByWithAggregationInputSchema ]).optional(),
  by: AccountScalarFieldEnumSchema.array(),
  having: AccountScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const AccountFindUniqueArgsSchema: z.ZodType<Prisma.AccountFindUniqueArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereUniqueInputSchema,
}).strict() ;

export const AccountFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.AccountFindUniqueOrThrowArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereUniqueInputSchema,
}).strict() ;

export const SessionFindFirstArgsSchema: z.ZodType<Prisma.SessionFindFirstArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereInputSchema.optional(),
  orderBy: z.union([ SessionOrderByWithRelationInputSchema.array(),SessionOrderByWithRelationInputSchema ]).optional(),
  cursor: SessionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SessionScalarFieldEnumSchema,SessionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const SessionFindFirstOrThrowArgsSchema: z.ZodType<Prisma.SessionFindFirstOrThrowArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereInputSchema.optional(),
  orderBy: z.union([ SessionOrderByWithRelationInputSchema.array(),SessionOrderByWithRelationInputSchema ]).optional(),
  cursor: SessionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SessionScalarFieldEnumSchema,SessionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const SessionFindManyArgsSchema: z.ZodType<Prisma.SessionFindManyArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereInputSchema.optional(),
  orderBy: z.union([ SessionOrderByWithRelationInputSchema.array(),SessionOrderByWithRelationInputSchema ]).optional(),
  cursor: SessionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SessionScalarFieldEnumSchema,SessionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const SessionAggregateArgsSchema: z.ZodType<Prisma.SessionAggregateArgs> = z.object({
  where: SessionWhereInputSchema.optional(),
  orderBy: z.union([ SessionOrderByWithRelationInputSchema.array(),SessionOrderByWithRelationInputSchema ]).optional(),
  cursor: SessionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const SessionGroupByArgsSchema: z.ZodType<Prisma.SessionGroupByArgs> = z.object({
  where: SessionWhereInputSchema.optional(),
  orderBy: z.union([ SessionOrderByWithAggregationInputSchema.array(),SessionOrderByWithAggregationInputSchema ]).optional(),
  by: SessionScalarFieldEnumSchema.array(),
  having: SessionScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const SessionFindUniqueArgsSchema: z.ZodType<Prisma.SessionFindUniqueArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereUniqueInputSchema,
}).strict() ;

export const SessionFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.SessionFindUniqueOrThrowArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereUniqueInputSchema,
}).strict() ;

export const VerificationTokenFindFirstArgsSchema: z.ZodType<Prisma.VerificationTokenFindFirstArgs> = z.object({
  select: VerificationTokenSelectSchema.optional(),
  where: VerificationTokenWhereInputSchema.optional(),
  orderBy: z.union([ VerificationTokenOrderByWithRelationInputSchema.array(),VerificationTokenOrderByWithRelationInputSchema ]).optional(),
  cursor: VerificationTokenWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ VerificationTokenScalarFieldEnumSchema,VerificationTokenScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const VerificationTokenFindFirstOrThrowArgsSchema: z.ZodType<Prisma.VerificationTokenFindFirstOrThrowArgs> = z.object({
  select: VerificationTokenSelectSchema.optional(),
  where: VerificationTokenWhereInputSchema.optional(),
  orderBy: z.union([ VerificationTokenOrderByWithRelationInputSchema.array(),VerificationTokenOrderByWithRelationInputSchema ]).optional(),
  cursor: VerificationTokenWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ VerificationTokenScalarFieldEnumSchema,VerificationTokenScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const VerificationTokenFindManyArgsSchema: z.ZodType<Prisma.VerificationTokenFindManyArgs> = z.object({
  select: VerificationTokenSelectSchema.optional(),
  where: VerificationTokenWhereInputSchema.optional(),
  orderBy: z.union([ VerificationTokenOrderByWithRelationInputSchema.array(),VerificationTokenOrderByWithRelationInputSchema ]).optional(),
  cursor: VerificationTokenWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ VerificationTokenScalarFieldEnumSchema,VerificationTokenScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const VerificationTokenAggregateArgsSchema: z.ZodType<Prisma.VerificationTokenAggregateArgs> = z.object({
  where: VerificationTokenWhereInputSchema.optional(),
  orderBy: z.union([ VerificationTokenOrderByWithRelationInputSchema.array(),VerificationTokenOrderByWithRelationInputSchema ]).optional(),
  cursor: VerificationTokenWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const VerificationTokenGroupByArgsSchema: z.ZodType<Prisma.VerificationTokenGroupByArgs> = z.object({
  where: VerificationTokenWhereInputSchema.optional(),
  orderBy: z.union([ VerificationTokenOrderByWithAggregationInputSchema.array(),VerificationTokenOrderByWithAggregationInputSchema ]).optional(),
  by: VerificationTokenScalarFieldEnumSchema.array(),
  having: VerificationTokenScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const VerificationTokenFindUniqueArgsSchema: z.ZodType<Prisma.VerificationTokenFindUniqueArgs> = z.object({
  select: VerificationTokenSelectSchema.optional(),
  where: VerificationTokenWhereUniqueInputSchema,
}).strict() ;

export const VerificationTokenFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.VerificationTokenFindUniqueOrThrowArgs> = z.object({
  select: VerificationTokenSelectSchema.optional(),
  where: VerificationTokenWhereUniqueInputSchema,
}).strict() ;

export const WorkoutOfMesocycleFindFirstArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleFindFirstArgs> = z.object({
  select: WorkoutOfMesocycleSelectSchema.optional(),
  include: WorkoutOfMesocycleIncludeSchema.optional(),
  where: WorkoutOfMesocycleWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOfMesocycleOrderByWithRelationInputSchema.array(),WorkoutOfMesocycleOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutOfMesocycleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WorkoutOfMesocycleScalarFieldEnumSchema,WorkoutOfMesocycleScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const WorkoutOfMesocycleFindFirstOrThrowArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleFindFirstOrThrowArgs> = z.object({
  select: WorkoutOfMesocycleSelectSchema.optional(),
  include: WorkoutOfMesocycleIncludeSchema.optional(),
  where: WorkoutOfMesocycleWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOfMesocycleOrderByWithRelationInputSchema.array(),WorkoutOfMesocycleOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutOfMesocycleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WorkoutOfMesocycleScalarFieldEnumSchema,WorkoutOfMesocycleScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const WorkoutOfMesocycleFindManyArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleFindManyArgs> = z.object({
  select: WorkoutOfMesocycleSelectSchema.optional(),
  include: WorkoutOfMesocycleIncludeSchema.optional(),
  where: WorkoutOfMesocycleWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOfMesocycleOrderByWithRelationInputSchema.array(),WorkoutOfMesocycleOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutOfMesocycleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WorkoutOfMesocycleScalarFieldEnumSchema,WorkoutOfMesocycleScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const WorkoutOfMesocycleAggregateArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleAggregateArgs> = z.object({
  where: WorkoutOfMesocycleWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOfMesocycleOrderByWithRelationInputSchema.array(),WorkoutOfMesocycleOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutOfMesocycleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const WorkoutOfMesocycleGroupByArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleGroupByArgs> = z.object({
  where: WorkoutOfMesocycleWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOfMesocycleOrderByWithAggregationInputSchema.array(),WorkoutOfMesocycleOrderByWithAggregationInputSchema ]).optional(),
  by: WorkoutOfMesocycleScalarFieldEnumSchema.array(),
  having: WorkoutOfMesocycleScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const WorkoutOfMesocycleFindUniqueArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleFindUniqueArgs> = z.object({
  select: WorkoutOfMesocycleSelectSchema.optional(),
  include: WorkoutOfMesocycleIncludeSchema.optional(),
  where: WorkoutOfMesocycleWhereUniqueInputSchema,
}).strict() ;

export const WorkoutOfMesocycleFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleFindUniqueOrThrowArgs> = z.object({
  select: WorkoutOfMesocycleSelectSchema.optional(),
  include: WorkoutOfMesocycleIncludeSchema.optional(),
  where: WorkoutOfMesocycleWhereUniqueInputSchema,
}).strict() ;

export const WorkoutFindFirstArgsSchema: z.ZodType<Prisma.WorkoutFindFirstArgs> = z.object({
  select: WorkoutSelectSchema.optional(),
  include: WorkoutIncludeSchema.optional(),
  where: WorkoutWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOrderByWithRelationInputSchema.array(),WorkoutOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WorkoutScalarFieldEnumSchema,WorkoutScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const WorkoutFindFirstOrThrowArgsSchema: z.ZodType<Prisma.WorkoutFindFirstOrThrowArgs> = z.object({
  select: WorkoutSelectSchema.optional(),
  include: WorkoutIncludeSchema.optional(),
  where: WorkoutWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOrderByWithRelationInputSchema.array(),WorkoutOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WorkoutScalarFieldEnumSchema,WorkoutScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const WorkoutFindManyArgsSchema: z.ZodType<Prisma.WorkoutFindManyArgs> = z.object({
  select: WorkoutSelectSchema.optional(),
  include: WorkoutIncludeSchema.optional(),
  where: WorkoutWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOrderByWithRelationInputSchema.array(),WorkoutOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WorkoutScalarFieldEnumSchema,WorkoutScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const WorkoutAggregateArgsSchema: z.ZodType<Prisma.WorkoutAggregateArgs> = z.object({
  where: WorkoutWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOrderByWithRelationInputSchema.array(),WorkoutOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const WorkoutGroupByArgsSchema: z.ZodType<Prisma.WorkoutGroupByArgs> = z.object({
  where: WorkoutWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutOrderByWithAggregationInputSchema.array(),WorkoutOrderByWithAggregationInputSchema ]).optional(),
  by: WorkoutScalarFieldEnumSchema.array(),
  having: WorkoutScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const WorkoutFindUniqueArgsSchema: z.ZodType<Prisma.WorkoutFindUniqueArgs> = z.object({
  select: WorkoutSelectSchema.optional(),
  include: WorkoutIncludeSchema.optional(),
  where: WorkoutWhereUniqueInputSchema,
}).strict() ;

export const WorkoutFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.WorkoutFindUniqueOrThrowArgs> = z.object({
  select: WorkoutSelectSchema.optional(),
  include: WorkoutIncludeSchema.optional(),
  where: WorkoutWhereUniqueInputSchema,
}).strict() ;

export const WorkoutExerciseFindFirstArgsSchema: z.ZodType<Prisma.WorkoutExerciseFindFirstArgs> = z.object({
  select: WorkoutExerciseSelectSchema.optional(),
  include: WorkoutExerciseIncludeSchema.optional(),
  where: WorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutExerciseOrderByWithRelationInputSchema.array(),WorkoutExerciseOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutExerciseWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WorkoutExerciseScalarFieldEnumSchema,WorkoutExerciseScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const WorkoutExerciseFindFirstOrThrowArgsSchema: z.ZodType<Prisma.WorkoutExerciseFindFirstOrThrowArgs> = z.object({
  select: WorkoutExerciseSelectSchema.optional(),
  include: WorkoutExerciseIncludeSchema.optional(),
  where: WorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutExerciseOrderByWithRelationInputSchema.array(),WorkoutExerciseOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutExerciseWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WorkoutExerciseScalarFieldEnumSchema,WorkoutExerciseScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const WorkoutExerciseFindManyArgsSchema: z.ZodType<Prisma.WorkoutExerciseFindManyArgs> = z.object({
  select: WorkoutExerciseSelectSchema.optional(),
  include: WorkoutExerciseIncludeSchema.optional(),
  where: WorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutExerciseOrderByWithRelationInputSchema.array(),WorkoutExerciseOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutExerciseWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WorkoutExerciseScalarFieldEnumSchema,WorkoutExerciseScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const WorkoutExerciseAggregateArgsSchema: z.ZodType<Prisma.WorkoutExerciseAggregateArgs> = z.object({
  where: WorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutExerciseOrderByWithRelationInputSchema.array(),WorkoutExerciseOrderByWithRelationInputSchema ]).optional(),
  cursor: WorkoutExerciseWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const WorkoutExerciseGroupByArgsSchema: z.ZodType<Prisma.WorkoutExerciseGroupByArgs> = z.object({
  where: WorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ WorkoutExerciseOrderByWithAggregationInputSchema.array(),WorkoutExerciseOrderByWithAggregationInputSchema ]).optional(),
  by: WorkoutExerciseScalarFieldEnumSchema.array(),
  having: WorkoutExerciseScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const WorkoutExerciseFindUniqueArgsSchema: z.ZodType<Prisma.WorkoutExerciseFindUniqueArgs> = z.object({
  select: WorkoutExerciseSelectSchema.optional(),
  include: WorkoutExerciseIncludeSchema.optional(),
  where: WorkoutExerciseWhereUniqueInputSchema,
}).strict() ;

export const WorkoutExerciseFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.WorkoutExerciseFindUniqueOrThrowArgs> = z.object({
  select: WorkoutExerciseSelectSchema.optional(),
  include: WorkoutExerciseIncludeSchema.optional(),
  where: WorkoutExerciseWhereUniqueInputSchema,
}).strict() ;

export const SetsOfWorkoutExerciseFindFirstArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseFindFirstArgs> = z.object({
  select: SetsOfWorkoutExerciseSelectSchema.optional(),
  include: SetsOfWorkoutExerciseIncludeSchema.optional(),
  where: SetsOfWorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ SetsOfWorkoutExerciseOrderByWithRelationInputSchema.array(),SetsOfWorkoutExerciseOrderByWithRelationInputSchema ]).optional(),
  cursor: SetsOfWorkoutExerciseWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SetsOfWorkoutExerciseScalarFieldEnumSchema,SetsOfWorkoutExerciseScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const SetsOfWorkoutExerciseFindFirstOrThrowArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseFindFirstOrThrowArgs> = z.object({
  select: SetsOfWorkoutExerciseSelectSchema.optional(),
  include: SetsOfWorkoutExerciseIncludeSchema.optional(),
  where: SetsOfWorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ SetsOfWorkoutExerciseOrderByWithRelationInputSchema.array(),SetsOfWorkoutExerciseOrderByWithRelationInputSchema ]).optional(),
  cursor: SetsOfWorkoutExerciseWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SetsOfWorkoutExerciseScalarFieldEnumSchema,SetsOfWorkoutExerciseScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const SetsOfWorkoutExerciseFindManyArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseFindManyArgs> = z.object({
  select: SetsOfWorkoutExerciseSelectSchema.optional(),
  include: SetsOfWorkoutExerciseIncludeSchema.optional(),
  where: SetsOfWorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ SetsOfWorkoutExerciseOrderByWithRelationInputSchema.array(),SetsOfWorkoutExerciseOrderByWithRelationInputSchema ]).optional(),
  cursor: SetsOfWorkoutExerciseWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ SetsOfWorkoutExerciseScalarFieldEnumSchema,SetsOfWorkoutExerciseScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const SetsOfWorkoutExerciseAggregateArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseAggregateArgs> = z.object({
  where: SetsOfWorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ SetsOfWorkoutExerciseOrderByWithRelationInputSchema.array(),SetsOfWorkoutExerciseOrderByWithRelationInputSchema ]).optional(),
  cursor: SetsOfWorkoutExerciseWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const SetsOfWorkoutExerciseGroupByArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseGroupByArgs> = z.object({
  where: SetsOfWorkoutExerciseWhereInputSchema.optional(),
  orderBy: z.union([ SetsOfWorkoutExerciseOrderByWithAggregationInputSchema.array(),SetsOfWorkoutExerciseOrderByWithAggregationInputSchema ]).optional(),
  by: SetsOfWorkoutExerciseScalarFieldEnumSchema.array(),
  having: SetsOfWorkoutExerciseScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const SetsOfWorkoutExerciseFindUniqueArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseFindUniqueArgs> = z.object({
  select: SetsOfWorkoutExerciseSelectSchema.optional(),
  include: SetsOfWorkoutExerciseIncludeSchema.optional(),
  where: SetsOfWorkoutExerciseWhereUniqueInputSchema,
}).strict() ;

export const SetsOfWorkoutExerciseFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseFindUniqueOrThrowArgs> = z.object({
  select: SetsOfWorkoutExerciseSelectSchema.optional(),
  include: SetsOfWorkoutExerciseIncludeSchema.optional(),
  where: SetsOfWorkoutExerciseWhereUniqueInputSchema,
}).strict() ;

export const StraightSetsFindFirstArgsSchema: z.ZodType<Prisma.StraightSetsFindFirstArgs> = z.object({
  select: StraightSetsSelectSchema.optional(),
  include: StraightSetsIncludeSchema.optional(),
  where: StraightSetsWhereInputSchema.optional(),
  orderBy: z.union([ StraightSetsOrderByWithRelationInputSchema.array(),StraightSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: StraightSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ StraightSetsScalarFieldEnumSchema,StraightSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const StraightSetsFindFirstOrThrowArgsSchema: z.ZodType<Prisma.StraightSetsFindFirstOrThrowArgs> = z.object({
  select: StraightSetsSelectSchema.optional(),
  include: StraightSetsIncludeSchema.optional(),
  where: StraightSetsWhereInputSchema.optional(),
  orderBy: z.union([ StraightSetsOrderByWithRelationInputSchema.array(),StraightSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: StraightSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ StraightSetsScalarFieldEnumSchema,StraightSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const StraightSetsFindManyArgsSchema: z.ZodType<Prisma.StraightSetsFindManyArgs> = z.object({
  select: StraightSetsSelectSchema.optional(),
  include: StraightSetsIncludeSchema.optional(),
  where: StraightSetsWhereInputSchema.optional(),
  orderBy: z.union([ StraightSetsOrderByWithRelationInputSchema.array(),StraightSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: StraightSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ StraightSetsScalarFieldEnumSchema,StraightSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const StraightSetsAggregateArgsSchema: z.ZodType<Prisma.StraightSetsAggregateArgs> = z.object({
  where: StraightSetsWhereInputSchema.optional(),
  orderBy: z.union([ StraightSetsOrderByWithRelationInputSchema.array(),StraightSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: StraightSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const StraightSetsGroupByArgsSchema: z.ZodType<Prisma.StraightSetsGroupByArgs> = z.object({
  where: StraightSetsWhereInputSchema.optional(),
  orderBy: z.union([ StraightSetsOrderByWithAggregationInputSchema.array(),StraightSetsOrderByWithAggregationInputSchema ]).optional(),
  by: StraightSetsScalarFieldEnumSchema.array(),
  having: StraightSetsScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const StraightSetsFindUniqueArgsSchema: z.ZodType<Prisma.StraightSetsFindUniqueArgs> = z.object({
  select: StraightSetsSelectSchema.optional(),
  include: StraightSetsIncludeSchema.optional(),
  where: StraightSetsWhereUniqueInputSchema,
}).strict() ;

export const StraightSetsFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.StraightSetsFindUniqueOrThrowArgs> = z.object({
  select: StraightSetsSelectSchema.optional(),
  include: StraightSetsIncludeSchema.optional(),
  where: StraightSetsWhereUniqueInputSchema,
}).strict() ;

export const FixedChangeSetsFindFirstArgsSchema: z.ZodType<Prisma.FixedChangeSetsFindFirstArgs> = z.object({
  select: FixedChangeSetsSelectSchema.optional(),
  include: FixedChangeSetsIncludeSchema.optional(),
  where: FixedChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ FixedChangeSetsOrderByWithRelationInputSchema.array(),FixedChangeSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: FixedChangeSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ FixedChangeSetsScalarFieldEnumSchema,FixedChangeSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const FixedChangeSetsFindFirstOrThrowArgsSchema: z.ZodType<Prisma.FixedChangeSetsFindFirstOrThrowArgs> = z.object({
  select: FixedChangeSetsSelectSchema.optional(),
  include: FixedChangeSetsIncludeSchema.optional(),
  where: FixedChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ FixedChangeSetsOrderByWithRelationInputSchema.array(),FixedChangeSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: FixedChangeSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ FixedChangeSetsScalarFieldEnumSchema,FixedChangeSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const FixedChangeSetsFindManyArgsSchema: z.ZodType<Prisma.FixedChangeSetsFindManyArgs> = z.object({
  select: FixedChangeSetsSelectSchema.optional(),
  include: FixedChangeSetsIncludeSchema.optional(),
  where: FixedChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ FixedChangeSetsOrderByWithRelationInputSchema.array(),FixedChangeSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: FixedChangeSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ FixedChangeSetsScalarFieldEnumSchema,FixedChangeSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const FixedChangeSetsAggregateArgsSchema: z.ZodType<Prisma.FixedChangeSetsAggregateArgs> = z.object({
  where: FixedChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ FixedChangeSetsOrderByWithRelationInputSchema.array(),FixedChangeSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: FixedChangeSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const FixedChangeSetsGroupByArgsSchema: z.ZodType<Prisma.FixedChangeSetsGroupByArgs> = z.object({
  where: FixedChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ FixedChangeSetsOrderByWithAggregationInputSchema.array(),FixedChangeSetsOrderByWithAggregationInputSchema ]).optional(),
  by: FixedChangeSetsScalarFieldEnumSchema.array(),
  having: FixedChangeSetsScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const FixedChangeSetsFindUniqueArgsSchema: z.ZodType<Prisma.FixedChangeSetsFindUniqueArgs> = z.object({
  select: FixedChangeSetsSelectSchema.optional(),
  include: FixedChangeSetsIncludeSchema.optional(),
  where: FixedChangeSetsWhereUniqueInputSchema,
}).strict() ;

export const FixedChangeSetsFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.FixedChangeSetsFindUniqueOrThrowArgs> = z.object({
  select: FixedChangeSetsSelectSchema.optional(),
  include: FixedChangeSetsIncludeSchema.optional(),
  where: FixedChangeSetsWhereUniqueInputSchema,
}).strict() ;

export const VariableChangeSetsFindFirstArgsSchema: z.ZodType<Prisma.VariableChangeSetsFindFirstArgs> = z.object({
  select: VariableChangeSetsSelectSchema.optional(),
  include: VariableChangeSetsIncludeSchema.optional(),
  where: VariableChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ VariableChangeSetsOrderByWithRelationInputSchema.array(),VariableChangeSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: VariableChangeSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ VariableChangeSetsScalarFieldEnumSchema,VariableChangeSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const VariableChangeSetsFindFirstOrThrowArgsSchema: z.ZodType<Prisma.VariableChangeSetsFindFirstOrThrowArgs> = z.object({
  select: VariableChangeSetsSelectSchema.optional(),
  include: VariableChangeSetsIncludeSchema.optional(),
  where: VariableChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ VariableChangeSetsOrderByWithRelationInputSchema.array(),VariableChangeSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: VariableChangeSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ VariableChangeSetsScalarFieldEnumSchema,VariableChangeSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const VariableChangeSetsFindManyArgsSchema: z.ZodType<Prisma.VariableChangeSetsFindManyArgs> = z.object({
  select: VariableChangeSetsSelectSchema.optional(),
  include: VariableChangeSetsIncludeSchema.optional(),
  where: VariableChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ VariableChangeSetsOrderByWithRelationInputSchema.array(),VariableChangeSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: VariableChangeSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ VariableChangeSetsScalarFieldEnumSchema,VariableChangeSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const VariableChangeSetsAggregateArgsSchema: z.ZodType<Prisma.VariableChangeSetsAggregateArgs> = z.object({
  where: VariableChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ VariableChangeSetsOrderByWithRelationInputSchema.array(),VariableChangeSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: VariableChangeSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const VariableChangeSetsGroupByArgsSchema: z.ZodType<Prisma.VariableChangeSetsGroupByArgs> = z.object({
  where: VariableChangeSetsWhereInputSchema.optional(),
  orderBy: z.union([ VariableChangeSetsOrderByWithAggregationInputSchema.array(),VariableChangeSetsOrderByWithAggregationInputSchema ]).optional(),
  by: VariableChangeSetsScalarFieldEnumSchema.array(),
  having: VariableChangeSetsScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const VariableChangeSetsFindUniqueArgsSchema: z.ZodType<Prisma.VariableChangeSetsFindUniqueArgs> = z.object({
  select: VariableChangeSetsSelectSchema.optional(),
  include: VariableChangeSetsIncludeSchema.optional(),
  where: VariableChangeSetsWhereUniqueInputSchema,
}).strict() ;

export const VariableChangeSetsFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.VariableChangeSetsFindUniqueOrThrowArgs> = z.object({
  select: VariableChangeSetsSelectSchema.optional(),
  include: VariableChangeSetsIncludeSchema.optional(),
  where: VariableChangeSetsWhereUniqueInputSchema,
}).strict() ;

export const MyorepMatchSetsFindFirstArgsSchema: z.ZodType<Prisma.MyorepMatchSetsFindFirstArgs> = z.object({
  select: MyorepMatchSetsSelectSchema.optional(),
  include: MyorepMatchSetsIncludeSchema.optional(),
  where: MyorepMatchSetsWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetsOrderByWithRelationInputSchema.array(),MyorepMatchSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: MyorepMatchSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MyorepMatchSetsScalarFieldEnumSchema,MyorepMatchSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MyorepMatchSetsFindFirstOrThrowArgsSchema: z.ZodType<Prisma.MyorepMatchSetsFindFirstOrThrowArgs> = z.object({
  select: MyorepMatchSetsSelectSchema.optional(),
  include: MyorepMatchSetsIncludeSchema.optional(),
  where: MyorepMatchSetsWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetsOrderByWithRelationInputSchema.array(),MyorepMatchSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: MyorepMatchSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MyorepMatchSetsScalarFieldEnumSchema,MyorepMatchSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MyorepMatchSetsFindManyArgsSchema: z.ZodType<Prisma.MyorepMatchSetsFindManyArgs> = z.object({
  select: MyorepMatchSetsSelectSchema.optional(),
  include: MyorepMatchSetsIncludeSchema.optional(),
  where: MyorepMatchSetsWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetsOrderByWithRelationInputSchema.array(),MyorepMatchSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: MyorepMatchSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MyorepMatchSetsScalarFieldEnumSchema,MyorepMatchSetsScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MyorepMatchSetsAggregateArgsSchema: z.ZodType<Prisma.MyorepMatchSetsAggregateArgs> = z.object({
  where: MyorepMatchSetsWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetsOrderByWithRelationInputSchema.array(),MyorepMatchSetsOrderByWithRelationInputSchema ]).optional(),
  cursor: MyorepMatchSetsWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MyorepMatchSetsGroupByArgsSchema: z.ZodType<Prisma.MyorepMatchSetsGroupByArgs> = z.object({
  where: MyorepMatchSetsWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetsOrderByWithAggregationInputSchema.array(),MyorepMatchSetsOrderByWithAggregationInputSchema ]).optional(),
  by: MyorepMatchSetsScalarFieldEnumSchema.array(),
  having: MyorepMatchSetsScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MyorepMatchSetsFindUniqueArgsSchema: z.ZodType<Prisma.MyorepMatchSetsFindUniqueArgs> = z.object({
  select: MyorepMatchSetsSelectSchema.optional(),
  include: MyorepMatchSetsIncludeSchema.optional(),
  where: MyorepMatchSetsWhereUniqueInputSchema,
}).strict() ;

export const MyorepMatchSetsFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.MyorepMatchSetsFindUniqueOrThrowArgs> = z.object({
  select: MyorepMatchSetsSelectSchema.optional(),
  include: MyorepMatchSetsIncludeSchema.optional(),
  where: MyorepMatchSetsWhereUniqueInputSchema,
}).strict() ;

export const MyorepMatchSetFindFirstArgsSchema: z.ZodType<Prisma.MyorepMatchSetFindFirstArgs> = z.object({
  select: MyorepMatchSetSelectSchema.optional(),
  include: MyorepMatchSetIncludeSchema.optional(),
  where: MyorepMatchSetWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetOrderByWithRelationInputSchema.array(),MyorepMatchSetOrderByWithRelationInputSchema ]).optional(),
  cursor: MyorepMatchSetWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MyorepMatchSetScalarFieldEnumSchema,MyorepMatchSetScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MyorepMatchSetFindFirstOrThrowArgsSchema: z.ZodType<Prisma.MyorepMatchSetFindFirstOrThrowArgs> = z.object({
  select: MyorepMatchSetSelectSchema.optional(),
  include: MyorepMatchSetIncludeSchema.optional(),
  where: MyorepMatchSetWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetOrderByWithRelationInputSchema.array(),MyorepMatchSetOrderByWithRelationInputSchema ]).optional(),
  cursor: MyorepMatchSetWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MyorepMatchSetScalarFieldEnumSchema,MyorepMatchSetScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MyorepMatchSetFindManyArgsSchema: z.ZodType<Prisma.MyorepMatchSetFindManyArgs> = z.object({
  select: MyorepMatchSetSelectSchema.optional(),
  include: MyorepMatchSetIncludeSchema.optional(),
  where: MyorepMatchSetWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetOrderByWithRelationInputSchema.array(),MyorepMatchSetOrderByWithRelationInputSchema ]).optional(),
  cursor: MyorepMatchSetWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MyorepMatchSetScalarFieldEnumSchema,MyorepMatchSetScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MyorepMatchSetAggregateArgsSchema: z.ZodType<Prisma.MyorepMatchSetAggregateArgs> = z.object({
  where: MyorepMatchSetWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetOrderByWithRelationInputSchema.array(),MyorepMatchSetOrderByWithRelationInputSchema ]).optional(),
  cursor: MyorepMatchSetWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MyorepMatchSetGroupByArgsSchema: z.ZodType<Prisma.MyorepMatchSetGroupByArgs> = z.object({
  where: MyorepMatchSetWhereInputSchema.optional(),
  orderBy: z.union([ MyorepMatchSetOrderByWithAggregationInputSchema.array(),MyorepMatchSetOrderByWithAggregationInputSchema ]).optional(),
  by: MyorepMatchSetScalarFieldEnumSchema.array(),
  having: MyorepMatchSetScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MyorepMatchSetFindUniqueArgsSchema: z.ZodType<Prisma.MyorepMatchSetFindUniqueArgs> = z.object({
  select: MyorepMatchSetSelectSchema.optional(),
  include: MyorepMatchSetIncludeSchema.optional(),
  where: MyorepMatchSetWhereUniqueInputSchema,
}).strict() ;

export const MyorepMatchSetFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.MyorepMatchSetFindUniqueOrThrowArgs> = z.object({
  select: MyorepMatchSetSelectSchema.optional(),
  include: MyorepMatchSetIncludeSchema.optional(),
  where: MyorepMatchSetWhereUniqueInputSchema,
}).strict() ;

export const ExerciseSplitCreateArgsSchema: z.ZodType<Prisma.ExerciseSplitCreateArgs> = z.object({
  select: ExerciseSplitSelectSchema.optional(),
  include: ExerciseSplitIncludeSchema.optional(),
  data: z.union([ ExerciseSplitCreateInputSchema,ExerciseSplitUncheckedCreateInputSchema ]),
}).strict() ;

export const ExerciseSplitUpsertArgsSchema: z.ZodType<Prisma.ExerciseSplitUpsertArgs> = z.object({
  select: ExerciseSplitSelectSchema.optional(),
  include: ExerciseSplitIncludeSchema.optional(),
  where: ExerciseSplitWhereUniqueInputSchema,
  create: z.union([ ExerciseSplitCreateInputSchema,ExerciseSplitUncheckedCreateInputSchema ]),
  update: z.union([ ExerciseSplitUpdateInputSchema,ExerciseSplitUncheckedUpdateInputSchema ]),
}).strict() ;

export const ExerciseSplitCreateManyArgsSchema: z.ZodType<Prisma.ExerciseSplitCreateManyArgs> = z.object({
  data: z.union([ ExerciseSplitCreateManyInputSchema,ExerciseSplitCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ExerciseSplitCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ExerciseSplitCreateManyAndReturnArgs> = z.object({
  data: z.union([ ExerciseSplitCreateManyInputSchema,ExerciseSplitCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ExerciseSplitDeleteArgsSchema: z.ZodType<Prisma.ExerciseSplitDeleteArgs> = z.object({
  select: ExerciseSplitSelectSchema.optional(),
  include: ExerciseSplitIncludeSchema.optional(),
  where: ExerciseSplitWhereUniqueInputSchema,
}).strict() ;

export const ExerciseSplitUpdateArgsSchema: z.ZodType<Prisma.ExerciseSplitUpdateArgs> = z.object({
  select: ExerciseSplitSelectSchema.optional(),
  include: ExerciseSplitIncludeSchema.optional(),
  data: z.union([ ExerciseSplitUpdateInputSchema,ExerciseSplitUncheckedUpdateInputSchema ]),
  where: ExerciseSplitWhereUniqueInputSchema,
}).strict() ;

export const ExerciseSplitUpdateManyArgsSchema: z.ZodType<Prisma.ExerciseSplitUpdateManyArgs> = z.object({
  data: z.union([ ExerciseSplitUpdateManyMutationInputSchema,ExerciseSplitUncheckedUpdateManyInputSchema ]),
  where: ExerciseSplitWhereInputSchema.optional(),
}).strict() ;

export const ExerciseSplitDeleteManyArgsSchema: z.ZodType<Prisma.ExerciseSplitDeleteManyArgs> = z.object({
  where: ExerciseSplitWhereInputSchema.optional(),
}).strict() ;

export const ExerciseSplitDayCreateArgsSchema: z.ZodType<Prisma.ExerciseSplitDayCreateArgs> = z.object({
  select: ExerciseSplitDaySelectSchema.optional(),
  include: ExerciseSplitDayIncludeSchema.optional(),
  data: z.union([ ExerciseSplitDayCreateInputSchema,ExerciseSplitDayUncheckedCreateInputSchema ]),
}).strict() ;

export const ExerciseSplitDayUpsertArgsSchema: z.ZodType<Prisma.ExerciseSplitDayUpsertArgs> = z.object({
  select: ExerciseSplitDaySelectSchema.optional(),
  include: ExerciseSplitDayIncludeSchema.optional(),
  where: ExerciseSplitDayWhereUniqueInputSchema,
  create: z.union([ ExerciseSplitDayCreateInputSchema,ExerciseSplitDayUncheckedCreateInputSchema ]),
  update: z.union([ ExerciseSplitDayUpdateInputSchema,ExerciseSplitDayUncheckedUpdateInputSchema ]),
}).strict() ;

export const ExerciseSplitDayCreateManyArgsSchema: z.ZodType<Prisma.ExerciseSplitDayCreateManyArgs> = z.object({
  data: z.union([ ExerciseSplitDayCreateManyInputSchema,ExerciseSplitDayCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ExerciseSplitDayCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ExerciseSplitDayCreateManyAndReturnArgs> = z.object({
  data: z.union([ ExerciseSplitDayCreateManyInputSchema,ExerciseSplitDayCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ExerciseSplitDayDeleteArgsSchema: z.ZodType<Prisma.ExerciseSplitDayDeleteArgs> = z.object({
  select: ExerciseSplitDaySelectSchema.optional(),
  include: ExerciseSplitDayIncludeSchema.optional(),
  where: ExerciseSplitDayWhereUniqueInputSchema,
}).strict() ;

export const ExerciseSplitDayUpdateArgsSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateArgs> = z.object({
  select: ExerciseSplitDaySelectSchema.optional(),
  include: ExerciseSplitDayIncludeSchema.optional(),
  data: z.union([ ExerciseSplitDayUpdateInputSchema,ExerciseSplitDayUncheckedUpdateInputSchema ]),
  where: ExerciseSplitDayWhereUniqueInputSchema,
}).strict() ;

export const ExerciseSplitDayUpdateManyArgsSchema: z.ZodType<Prisma.ExerciseSplitDayUpdateManyArgs> = z.object({
  data: z.union([ ExerciseSplitDayUpdateManyMutationInputSchema,ExerciseSplitDayUncheckedUpdateManyInputSchema ]),
  where: ExerciseSplitDayWhereInputSchema.optional(),
}).strict() ;

export const ExerciseSplitDayDeleteManyArgsSchema: z.ZodType<Prisma.ExerciseSplitDayDeleteManyArgs> = z.object({
  where: ExerciseSplitDayWhereInputSchema.optional(),
}).strict() ;

export const ExerciseTemplateCreateArgsSchema: z.ZodType<Prisma.ExerciseTemplateCreateArgs> = z.object({
  select: ExerciseTemplateSelectSchema.optional(),
  include: ExerciseTemplateIncludeSchema.optional(),
  data: z.union([ ExerciseTemplateCreateInputSchema,ExerciseTemplateUncheckedCreateInputSchema ]),
}).strict() ;

export const ExerciseTemplateUpsertArgsSchema: z.ZodType<Prisma.ExerciseTemplateUpsertArgs> = z.object({
  select: ExerciseTemplateSelectSchema.optional(),
  include: ExerciseTemplateIncludeSchema.optional(),
  where: ExerciseTemplateWhereUniqueInputSchema,
  create: z.union([ ExerciseTemplateCreateInputSchema,ExerciseTemplateUncheckedCreateInputSchema ]),
  update: z.union([ ExerciseTemplateUpdateInputSchema,ExerciseTemplateUncheckedUpdateInputSchema ]),
}).strict() ;

export const ExerciseTemplateCreateManyArgsSchema: z.ZodType<Prisma.ExerciseTemplateCreateManyArgs> = z.object({
  data: z.union([ ExerciseTemplateCreateManyInputSchema,ExerciseTemplateCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ExerciseTemplateCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ExerciseTemplateCreateManyAndReturnArgs> = z.object({
  data: z.union([ ExerciseTemplateCreateManyInputSchema,ExerciseTemplateCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ExerciseTemplateDeleteArgsSchema: z.ZodType<Prisma.ExerciseTemplateDeleteArgs> = z.object({
  select: ExerciseTemplateSelectSchema.optional(),
  include: ExerciseTemplateIncludeSchema.optional(),
  where: ExerciseTemplateWhereUniqueInputSchema,
}).strict() ;

export const ExerciseTemplateUpdateArgsSchema: z.ZodType<Prisma.ExerciseTemplateUpdateArgs> = z.object({
  select: ExerciseTemplateSelectSchema.optional(),
  include: ExerciseTemplateIncludeSchema.optional(),
  data: z.union([ ExerciseTemplateUpdateInputSchema,ExerciseTemplateUncheckedUpdateInputSchema ]),
  where: ExerciseTemplateWhereUniqueInputSchema,
}).strict() ;

export const ExerciseTemplateUpdateManyArgsSchema: z.ZodType<Prisma.ExerciseTemplateUpdateManyArgs> = z.object({
  data: z.union([ ExerciseTemplateUpdateManyMutationInputSchema,ExerciseTemplateUncheckedUpdateManyInputSchema ]),
  where: ExerciseTemplateWhereInputSchema.optional(),
}).strict() ;

export const ExerciseTemplateDeleteManyArgsSchema: z.ZodType<Prisma.ExerciseTemplateDeleteManyArgs> = z.object({
  where: ExerciseTemplateWhereInputSchema.optional(),
}).strict() ;

export const MesocycleCreateArgsSchema: z.ZodType<Prisma.MesocycleCreateArgs> = z.object({
  select: MesocycleSelectSchema.optional(),
  include: MesocycleIncludeSchema.optional(),
  data: z.union([ MesocycleCreateInputSchema,MesocycleUncheckedCreateInputSchema ]),
}).strict() ;

export const MesocycleUpsertArgsSchema: z.ZodType<Prisma.MesocycleUpsertArgs> = z.object({
  select: MesocycleSelectSchema.optional(),
  include: MesocycleIncludeSchema.optional(),
  where: MesocycleWhereUniqueInputSchema,
  create: z.union([ MesocycleCreateInputSchema,MesocycleUncheckedCreateInputSchema ]),
  update: z.union([ MesocycleUpdateInputSchema,MesocycleUncheckedUpdateInputSchema ]),
}).strict() ;

export const MesocycleCreateManyArgsSchema: z.ZodType<Prisma.MesocycleCreateManyArgs> = z.object({
  data: z.union([ MesocycleCreateManyInputSchema,MesocycleCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MesocycleCreateManyAndReturnArgsSchema: z.ZodType<Prisma.MesocycleCreateManyAndReturnArgs> = z.object({
  data: z.union([ MesocycleCreateManyInputSchema,MesocycleCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MesocycleDeleteArgsSchema: z.ZodType<Prisma.MesocycleDeleteArgs> = z.object({
  select: MesocycleSelectSchema.optional(),
  include: MesocycleIncludeSchema.optional(),
  where: MesocycleWhereUniqueInputSchema,
}).strict() ;

export const MesocycleUpdateArgsSchema: z.ZodType<Prisma.MesocycleUpdateArgs> = z.object({
  select: MesocycleSelectSchema.optional(),
  include: MesocycleIncludeSchema.optional(),
  data: z.union([ MesocycleUpdateInputSchema,MesocycleUncheckedUpdateInputSchema ]),
  where: MesocycleWhereUniqueInputSchema,
}).strict() ;

export const MesocycleUpdateManyArgsSchema: z.ZodType<Prisma.MesocycleUpdateManyArgs> = z.object({
  data: z.union([ MesocycleUpdateManyMutationInputSchema,MesocycleUncheckedUpdateManyInputSchema ]),
  where: MesocycleWhereInputSchema.optional(),
}).strict() ;

export const MesocycleDeleteManyArgsSchema: z.ZodType<Prisma.MesocycleDeleteManyArgs> = z.object({
  where: MesocycleWhereInputSchema.optional(),
}).strict() ;

export const MesocycleCyclicSetChangeCreateArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateArgs> = z.object({
  select: MesocycleCyclicSetChangeSelectSchema.optional(),
  include: MesocycleCyclicSetChangeIncludeSchema.optional(),
  data: z.union([ MesocycleCyclicSetChangeCreateInputSchema,MesocycleCyclicSetChangeUncheckedCreateInputSchema ]),
}).strict() ;

export const MesocycleCyclicSetChangeUpsertArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpsertArgs> = z.object({
  select: MesocycleCyclicSetChangeSelectSchema.optional(),
  include: MesocycleCyclicSetChangeIncludeSchema.optional(),
  where: MesocycleCyclicSetChangeWhereUniqueInputSchema,
  create: z.union([ MesocycleCyclicSetChangeCreateInputSchema,MesocycleCyclicSetChangeUncheckedCreateInputSchema ]),
  update: z.union([ MesocycleCyclicSetChangeUpdateInputSchema,MesocycleCyclicSetChangeUncheckedUpdateInputSchema ]),
}).strict() ;

export const MesocycleCyclicSetChangeCreateManyArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateManyArgs> = z.object({
  data: z.union([ MesocycleCyclicSetChangeCreateManyInputSchema,MesocycleCyclicSetChangeCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MesocycleCyclicSetChangeCreateManyAndReturnArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeCreateManyAndReturnArgs> = z.object({
  data: z.union([ MesocycleCyclicSetChangeCreateManyInputSchema,MesocycleCyclicSetChangeCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MesocycleCyclicSetChangeDeleteArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeDeleteArgs> = z.object({
  select: MesocycleCyclicSetChangeSelectSchema.optional(),
  include: MesocycleCyclicSetChangeIncludeSchema.optional(),
  where: MesocycleCyclicSetChangeWhereUniqueInputSchema,
}).strict() ;

export const MesocycleCyclicSetChangeUpdateArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpdateArgs> = z.object({
  select: MesocycleCyclicSetChangeSelectSchema.optional(),
  include: MesocycleCyclicSetChangeIncludeSchema.optional(),
  data: z.union([ MesocycleCyclicSetChangeUpdateInputSchema,MesocycleCyclicSetChangeUncheckedUpdateInputSchema ]),
  where: MesocycleCyclicSetChangeWhereUniqueInputSchema,
}).strict() ;

export const MesocycleCyclicSetChangeUpdateManyArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeUpdateManyArgs> = z.object({
  data: z.union([ MesocycleCyclicSetChangeUpdateManyMutationInputSchema,MesocycleCyclicSetChangeUncheckedUpdateManyInputSchema ]),
  where: MesocycleCyclicSetChangeWhereInputSchema.optional(),
}).strict() ;

export const MesocycleCyclicSetChangeDeleteManyArgsSchema: z.ZodType<Prisma.MesocycleCyclicSetChangeDeleteManyArgs> = z.object({
  where: MesocycleCyclicSetChangeWhereInputSchema.optional(),
}).strict() ;

export const MesocycleExerciseSplitDayCreateArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateArgs> = z.object({
  select: MesocycleExerciseSplitDaySelectSchema.optional(),
  include: MesocycleExerciseSplitDayIncludeSchema.optional(),
  data: z.union([ MesocycleExerciseSplitDayCreateInputSchema,MesocycleExerciseSplitDayUncheckedCreateInputSchema ]),
}).strict() ;

export const MesocycleExerciseSplitDayUpsertArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpsertArgs> = z.object({
  select: MesocycleExerciseSplitDaySelectSchema.optional(),
  include: MesocycleExerciseSplitDayIncludeSchema.optional(),
  where: MesocycleExerciseSplitDayWhereUniqueInputSchema,
  create: z.union([ MesocycleExerciseSplitDayCreateInputSchema,MesocycleExerciseSplitDayUncheckedCreateInputSchema ]),
  update: z.union([ MesocycleExerciseSplitDayUpdateInputSchema,MesocycleExerciseSplitDayUncheckedUpdateInputSchema ]),
}).strict() ;

export const MesocycleExerciseSplitDayCreateManyArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateManyArgs> = z.object({
  data: z.union([ MesocycleExerciseSplitDayCreateManyInputSchema,MesocycleExerciseSplitDayCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MesocycleExerciseSplitDayCreateManyAndReturnArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayCreateManyAndReturnArgs> = z.object({
  data: z.union([ MesocycleExerciseSplitDayCreateManyInputSchema,MesocycleExerciseSplitDayCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MesocycleExerciseSplitDayDeleteArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayDeleteArgs> = z.object({
  select: MesocycleExerciseSplitDaySelectSchema.optional(),
  include: MesocycleExerciseSplitDayIncludeSchema.optional(),
  where: MesocycleExerciseSplitDayWhereUniqueInputSchema,
}).strict() ;

export const MesocycleExerciseSplitDayUpdateArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateArgs> = z.object({
  select: MesocycleExerciseSplitDaySelectSchema.optional(),
  include: MesocycleExerciseSplitDayIncludeSchema.optional(),
  data: z.union([ MesocycleExerciseSplitDayUpdateInputSchema,MesocycleExerciseSplitDayUncheckedUpdateInputSchema ]),
  where: MesocycleExerciseSplitDayWhereUniqueInputSchema,
}).strict() ;

export const MesocycleExerciseSplitDayUpdateManyArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayUpdateManyArgs> = z.object({
  data: z.union([ MesocycleExerciseSplitDayUpdateManyMutationInputSchema,MesocycleExerciseSplitDayUncheckedUpdateManyInputSchema ]),
  where: MesocycleExerciseSplitDayWhereInputSchema.optional(),
}).strict() ;

export const MesocycleExerciseSplitDayDeleteManyArgsSchema: z.ZodType<Prisma.MesocycleExerciseSplitDayDeleteManyArgs> = z.object({
  where: MesocycleExerciseSplitDayWhereInputSchema.optional(),
}).strict() ;

export const MesocycleExerciseTemplateCreateArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateArgs> = z.object({
  select: MesocycleExerciseTemplateSelectSchema.optional(),
  include: MesocycleExerciseTemplateIncludeSchema.optional(),
  data: z.union([ MesocycleExerciseTemplateCreateInputSchema,MesocycleExerciseTemplateUncheckedCreateInputSchema ]),
}).strict() ;

export const MesocycleExerciseTemplateUpsertArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpsertArgs> = z.object({
  select: MesocycleExerciseTemplateSelectSchema.optional(),
  include: MesocycleExerciseTemplateIncludeSchema.optional(),
  where: MesocycleExerciseTemplateWhereUniqueInputSchema,
  create: z.union([ MesocycleExerciseTemplateCreateInputSchema,MesocycleExerciseTemplateUncheckedCreateInputSchema ]),
  update: z.union([ MesocycleExerciseTemplateUpdateInputSchema,MesocycleExerciseTemplateUncheckedUpdateInputSchema ]),
}).strict() ;

export const MesocycleExerciseTemplateCreateManyArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateManyArgs> = z.object({
  data: z.union([ MesocycleExerciseTemplateCreateManyInputSchema,MesocycleExerciseTemplateCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MesocycleExerciseTemplateCreateManyAndReturnArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateCreateManyAndReturnArgs> = z.object({
  data: z.union([ MesocycleExerciseTemplateCreateManyInputSchema,MesocycleExerciseTemplateCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MesocycleExerciseTemplateDeleteArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateDeleteArgs> = z.object({
  select: MesocycleExerciseTemplateSelectSchema.optional(),
  include: MesocycleExerciseTemplateIncludeSchema.optional(),
  where: MesocycleExerciseTemplateWhereUniqueInputSchema,
}).strict() ;

export const MesocycleExerciseTemplateUpdateArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpdateArgs> = z.object({
  select: MesocycleExerciseTemplateSelectSchema.optional(),
  include: MesocycleExerciseTemplateIncludeSchema.optional(),
  data: z.union([ MesocycleExerciseTemplateUpdateInputSchema,MesocycleExerciseTemplateUncheckedUpdateInputSchema ]),
  where: MesocycleExerciseTemplateWhereUniqueInputSchema,
}).strict() ;

export const MesocycleExerciseTemplateUpdateManyArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateUpdateManyArgs> = z.object({
  data: z.union([ MesocycleExerciseTemplateUpdateManyMutationInputSchema,MesocycleExerciseTemplateUncheckedUpdateManyInputSchema ]),
  where: MesocycleExerciseTemplateWhereInputSchema.optional(),
}).strict() ;

export const MesocycleExerciseTemplateDeleteManyArgsSchema: z.ZodType<Prisma.MesocycleExerciseTemplateDeleteManyArgs> = z.object({
  where: MesocycleExerciseTemplateWhereInputSchema.optional(),
}).strict() ;

export const UserCreateArgsSchema: z.ZodType<Prisma.UserCreateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserCreateInputSchema,UserUncheckedCreateInputSchema ]),
}).strict() ;

export const UserUpsertArgsSchema: z.ZodType<Prisma.UserUpsertArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
  create: z.union([ UserCreateInputSchema,UserUncheckedCreateInputSchema ]),
  update: z.union([ UserUpdateInputSchema,UserUncheckedUpdateInputSchema ]),
}).strict() ;

export const UserCreateManyArgsSchema: z.ZodType<Prisma.UserCreateManyArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema,UserCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const UserCreateManyAndReturnArgsSchema: z.ZodType<Prisma.UserCreateManyAndReturnArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema,UserCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const UserDeleteArgsSchema: z.ZodType<Prisma.UserDeleteArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const UserUpdateArgsSchema: z.ZodType<Prisma.UserUpdateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserUpdateInputSchema,UserUncheckedUpdateInputSchema ]),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const UserUpdateManyArgsSchema: z.ZodType<Prisma.UserUpdateManyArgs> = z.object({
  data: z.union([ UserUpdateManyMutationInputSchema,UserUncheckedUpdateManyInputSchema ]),
  where: UserWhereInputSchema.optional(),
}).strict() ;

export const UserDeleteManyArgsSchema: z.ZodType<Prisma.UserDeleteManyArgs> = z.object({
  where: UserWhereInputSchema.optional(),
}).strict() ;

export const AccountCreateArgsSchema: z.ZodType<Prisma.AccountCreateArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  data: z.union([ AccountCreateInputSchema,AccountUncheckedCreateInputSchema ]),
}).strict() ;

export const AccountUpsertArgsSchema: z.ZodType<Prisma.AccountUpsertArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereUniqueInputSchema,
  create: z.union([ AccountCreateInputSchema,AccountUncheckedCreateInputSchema ]),
  update: z.union([ AccountUpdateInputSchema,AccountUncheckedUpdateInputSchema ]),
}).strict() ;

export const AccountCreateManyArgsSchema: z.ZodType<Prisma.AccountCreateManyArgs> = z.object({
  data: z.union([ AccountCreateManyInputSchema,AccountCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const AccountCreateManyAndReturnArgsSchema: z.ZodType<Prisma.AccountCreateManyAndReturnArgs> = z.object({
  data: z.union([ AccountCreateManyInputSchema,AccountCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const AccountDeleteArgsSchema: z.ZodType<Prisma.AccountDeleteArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  where: AccountWhereUniqueInputSchema,
}).strict() ;

export const AccountUpdateArgsSchema: z.ZodType<Prisma.AccountUpdateArgs> = z.object({
  select: AccountSelectSchema.optional(),
  include: AccountIncludeSchema.optional(),
  data: z.union([ AccountUpdateInputSchema,AccountUncheckedUpdateInputSchema ]),
  where: AccountWhereUniqueInputSchema,
}).strict() ;

export const AccountUpdateManyArgsSchema: z.ZodType<Prisma.AccountUpdateManyArgs> = z.object({
  data: z.union([ AccountUpdateManyMutationInputSchema,AccountUncheckedUpdateManyInputSchema ]),
  where: AccountWhereInputSchema.optional(),
}).strict() ;

export const AccountDeleteManyArgsSchema: z.ZodType<Prisma.AccountDeleteManyArgs> = z.object({
  where: AccountWhereInputSchema.optional(),
}).strict() ;

export const SessionCreateArgsSchema: z.ZodType<Prisma.SessionCreateArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  data: z.union([ SessionCreateInputSchema,SessionUncheckedCreateInputSchema ]),
}).strict() ;

export const SessionUpsertArgsSchema: z.ZodType<Prisma.SessionUpsertArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereUniqueInputSchema,
  create: z.union([ SessionCreateInputSchema,SessionUncheckedCreateInputSchema ]),
  update: z.union([ SessionUpdateInputSchema,SessionUncheckedUpdateInputSchema ]),
}).strict() ;

export const SessionCreateManyArgsSchema: z.ZodType<Prisma.SessionCreateManyArgs> = z.object({
  data: z.union([ SessionCreateManyInputSchema,SessionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const SessionCreateManyAndReturnArgsSchema: z.ZodType<Prisma.SessionCreateManyAndReturnArgs> = z.object({
  data: z.union([ SessionCreateManyInputSchema,SessionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const SessionDeleteArgsSchema: z.ZodType<Prisma.SessionDeleteArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  where: SessionWhereUniqueInputSchema,
}).strict() ;

export const SessionUpdateArgsSchema: z.ZodType<Prisma.SessionUpdateArgs> = z.object({
  select: SessionSelectSchema.optional(),
  include: SessionIncludeSchema.optional(),
  data: z.union([ SessionUpdateInputSchema,SessionUncheckedUpdateInputSchema ]),
  where: SessionWhereUniqueInputSchema,
}).strict() ;

export const SessionUpdateManyArgsSchema: z.ZodType<Prisma.SessionUpdateManyArgs> = z.object({
  data: z.union([ SessionUpdateManyMutationInputSchema,SessionUncheckedUpdateManyInputSchema ]),
  where: SessionWhereInputSchema.optional(),
}).strict() ;

export const SessionDeleteManyArgsSchema: z.ZodType<Prisma.SessionDeleteManyArgs> = z.object({
  where: SessionWhereInputSchema.optional(),
}).strict() ;

export const VerificationTokenCreateArgsSchema: z.ZodType<Prisma.VerificationTokenCreateArgs> = z.object({
  select: VerificationTokenSelectSchema.optional(),
  data: z.union([ VerificationTokenCreateInputSchema,VerificationTokenUncheckedCreateInputSchema ]),
}).strict() ;

export const VerificationTokenUpsertArgsSchema: z.ZodType<Prisma.VerificationTokenUpsertArgs> = z.object({
  select: VerificationTokenSelectSchema.optional(),
  where: VerificationTokenWhereUniqueInputSchema,
  create: z.union([ VerificationTokenCreateInputSchema,VerificationTokenUncheckedCreateInputSchema ]),
  update: z.union([ VerificationTokenUpdateInputSchema,VerificationTokenUncheckedUpdateInputSchema ]),
}).strict() ;

export const VerificationTokenCreateManyArgsSchema: z.ZodType<Prisma.VerificationTokenCreateManyArgs> = z.object({
  data: z.union([ VerificationTokenCreateManyInputSchema,VerificationTokenCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const VerificationTokenCreateManyAndReturnArgsSchema: z.ZodType<Prisma.VerificationTokenCreateManyAndReturnArgs> = z.object({
  data: z.union([ VerificationTokenCreateManyInputSchema,VerificationTokenCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const VerificationTokenDeleteArgsSchema: z.ZodType<Prisma.VerificationTokenDeleteArgs> = z.object({
  select: VerificationTokenSelectSchema.optional(),
  where: VerificationTokenWhereUniqueInputSchema,
}).strict() ;

export const VerificationTokenUpdateArgsSchema: z.ZodType<Prisma.VerificationTokenUpdateArgs> = z.object({
  select: VerificationTokenSelectSchema.optional(),
  data: z.union([ VerificationTokenUpdateInputSchema,VerificationTokenUncheckedUpdateInputSchema ]),
  where: VerificationTokenWhereUniqueInputSchema,
}).strict() ;

export const VerificationTokenUpdateManyArgsSchema: z.ZodType<Prisma.VerificationTokenUpdateManyArgs> = z.object({
  data: z.union([ VerificationTokenUpdateManyMutationInputSchema,VerificationTokenUncheckedUpdateManyInputSchema ]),
  where: VerificationTokenWhereInputSchema.optional(),
}).strict() ;

export const VerificationTokenDeleteManyArgsSchema: z.ZodType<Prisma.VerificationTokenDeleteManyArgs> = z.object({
  where: VerificationTokenWhereInputSchema.optional(),
}).strict() ;

export const WorkoutOfMesocycleCreateArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateArgs> = z.object({
  select: WorkoutOfMesocycleSelectSchema.optional(),
  include: WorkoutOfMesocycleIncludeSchema.optional(),
  data: z.union([ WorkoutOfMesocycleCreateInputSchema,WorkoutOfMesocycleUncheckedCreateInputSchema ]),
}).strict() ;

export const WorkoutOfMesocycleUpsertArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpsertArgs> = z.object({
  select: WorkoutOfMesocycleSelectSchema.optional(),
  include: WorkoutOfMesocycleIncludeSchema.optional(),
  where: WorkoutOfMesocycleWhereUniqueInputSchema,
  create: z.union([ WorkoutOfMesocycleCreateInputSchema,WorkoutOfMesocycleUncheckedCreateInputSchema ]),
  update: z.union([ WorkoutOfMesocycleUpdateInputSchema,WorkoutOfMesocycleUncheckedUpdateInputSchema ]),
}).strict() ;

export const WorkoutOfMesocycleCreateManyArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateManyArgs> = z.object({
  data: z.union([ WorkoutOfMesocycleCreateManyInputSchema,WorkoutOfMesocycleCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const WorkoutOfMesocycleCreateManyAndReturnArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleCreateManyAndReturnArgs> = z.object({
  data: z.union([ WorkoutOfMesocycleCreateManyInputSchema,WorkoutOfMesocycleCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const WorkoutOfMesocycleDeleteArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleDeleteArgs> = z.object({
  select: WorkoutOfMesocycleSelectSchema.optional(),
  include: WorkoutOfMesocycleIncludeSchema.optional(),
  where: WorkoutOfMesocycleWhereUniqueInputSchema,
}).strict() ;

export const WorkoutOfMesocycleUpdateArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateArgs> = z.object({
  select: WorkoutOfMesocycleSelectSchema.optional(),
  include: WorkoutOfMesocycleIncludeSchema.optional(),
  data: z.union([ WorkoutOfMesocycleUpdateInputSchema,WorkoutOfMesocycleUncheckedUpdateInputSchema ]),
  where: WorkoutOfMesocycleWhereUniqueInputSchema,
}).strict() ;

export const WorkoutOfMesocycleUpdateManyArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleUpdateManyArgs> = z.object({
  data: z.union([ WorkoutOfMesocycleUpdateManyMutationInputSchema,WorkoutOfMesocycleUncheckedUpdateManyInputSchema ]),
  where: WorkoutOfMesocycleWhereInputSchema.optional(),
}).strict() ;

export const WorkoutOfMesocycleDeleteManyArgsSchema: z.ZodType<Prisma.WorkoutOfMesocycleDeleteManyArgs> = z.object({
  where: WorkoutOfMesocycleWhereInputSchema.optional(),
}).strict() ;

export const WorkoutCreateArgsSchema: z.ZodType<Prisma.WorkoutCreateArgs> = z.object({
  select: WorkoutSelectSchema.optional(),
  include: WorkoutIncludeSchema.optional(),
  data: z.union([ WorkoutCreateInputSchema,WorkoutUncheckedCreateInputSchema ]),
}).strict() ;

export const WorkoutUpsertArgsSchema: z.ZodType<Prisma.WorkoutUpsertArgs> = z.object({
  select: WorkoutSelectSchema.optional(),
  include: WorkoutIncludeSchema.optional(),
  where: WorkoutWhereUniqueInputSchema,
  create: z.union([ WorkoutCreateInputSchema,WorkoutUncheckedCreateInputSchema ]),
  update: z.union([ WorkoutUpdateInputSchema,WorkoutUncheckedUpdateInputSchema ]),
}).strict() ;

export const WorkoutCreateManyArgsSchema: z.ZodType<Prisma.WorkoutCreateManyArgs> = z.object({
  data: z.union([ WorkoutCreateManyInputSchema,WorkoutCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const WorkoutCreateManyAndReturnArgsSchema: z.ZodType<Prisma.WorkoutCreateManyAndReturnArgs> = z.object({
  data: z.union([ WorkoutCreateManyInputSchema,WorkoutCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const WorkoutDeleteArgsSchema: z.ZodType<Prisma.WorkoutDeleteArgs> = z.object({
  select: WorkoutSelectSchema.optional(),
  include: WorkoutIncludeSchema.optional(),
  where: WorkoutWhereUniqueInputSchema,
}).strict() ;

export const WorkoutUpdateArgsSchema: z.ZodType<Prisma.WorkoutUpdateArgs> = z.object({
  select: WorkoutSelectSchema.optional(),
  include: WorkoutIncludeSchema.optional(),
  data: z.union([ WorkoutUpdateInputSchema,WorkoutUncheckedUpdateInputSchema ]),
  where: WorkoutWhereUniqueInputSchema,
}).strict() ;

export const WorkoutUpdateManyArgsSchema: z.ZodType<Prisma.WorkoutUpdateManyArgs> = z.object({
  data: z.union([ WorkoutUpdateManyMutationInputSchema,WorkoutUncheckedUpdateManyInputSchema ]),
  where: WorkoutWhereInputSchema.optional(),
}).strict() ;

export const WorkoutDeleteManyArgsSchema: z.ZodType<Prisma.WorkoutDeleteManyArgs> = z.object({
  where: WorkoutWhereInputSchema.optional(),
}).strict() ;

export const WorkoutExerciseCreateArgsSchema: z.ZodType<Prisma.WorkoutExerciseCreateArgs> = z.object({
  select: WorkoutExerciseSelectSchema.optional(),
  include: WorkoutExerciseIncludeSchema.optional(),
  data: z.union([ WorkoutExerciseCreateInputSchema,WorkoutExerciseUncheckedCreateInputSchema ]),
}).strict() ;

export const WorkoutExerciseUpsertArgsSchema: z.ZodType<Prisma.WorkoutExerciseUpsertArgs> = z.object({
  select: WorkoutExerciseSelectSchema.optional(),
  include: WorkoutExerciseIncludeSchema.optional(),
  where: WorkoutExerciseWhereUniqueInputSchema,
  create: z.union([ WorkoutExerciseCreateInputSchema,WorkoutExerciseUncheckedCreateInputSchema ]),
  update: z.union([ WorkoutExerciseUpdateInputSchema,WorkoutExerciseUncheckedUpdateInputSchema ]),
}).strict() ;

export const WorkoutExerciseCreateManyArgsSchema: z.ZodType<Prisma.WorkoutExerciseCreateManyArgs> = z.object({
  data: z.union([ WorkoutExerciseCreateManyInputSchema,WorkoutExerciseCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const WorkoutExerciseCreateManyAndReturnArgsSchema: z.ZodType<Prisma.WorkoutExerciseCreateManyAndReturnArgs> = z.object({
  data: z.union([ WorkoutExerciseCreateManyInputSchema,WorkoutExerciseCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const WorkoutExerciseDeleteArgsSchema: z.ZodType<Prisma.WorkoutExerciseDeleteArgs> = z.object({
  select: WorkoutExerciseSelectSchema.optional(),
  include: WorkoutExerciseIncludeSchema.optional(),
  where: WorkoutExerciseWhereUniqueInputSchema,
}).strict() ;

export const WorkoutExerciseUpdateArgsSchema: z.ZodType<Prisma.WorkoutExerciseUpdateArgs> = z.object({
  select: WorkoutExerciseSelectSchema.optional(),
  include: WorkoutExerciseIncludeSchema.optional(),
  data: z.union([ WorkoutExerciseUpdateInputSchema,WorkoutExerciseUncheckedUpdateInputSchema ]),
  where: WorkoutExerciseWhereUniqueInputSchema,
}).strict() ;

export const WorkoutExerciseUpdateManyArgsSchema: z.ZodType<Prisma.WorkoutExerciseUpdateManyArgs> = z.object({
  data: z.union([ WorkoutExerciseUpdateManyMutationInputSchema,WorkoutExerciseUncheckedUpdateManyInputSchema ]),
  where: WorkoutExerciseWhereInputSchema.optional(),
}).strict() ;

export const WorkoutExerciseDeleteManyArgsSchema: z.ZodType<Prisma.WorkoutExerciseDeleteManyArgs> = z.object({
  where: WorkoutExerciseWhereInputSchema.optional(),
}).strict() ;

export const SetsOfWorkoutExerciseCreateArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateArgs> = z.object({
  select: SetsOfWorkoutExerciseSelectSchema.optional(),
  include: SetsOfWorkoutExerciseIncludeSchema.optional(),
  data: z.union([ SetsOfWorkoutExerciseCreateInputSchema,SetsOfWorkoutExerciseUncheckedCreateInputSchema ]),
}).strict() ;

export const SetsOfWorkoutExerciseUpsertArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpsertArgs> = z.object({
  select: SetsOfWorkoutExerciseSelectSchema.optional(),
  include: SetsOfWorkoutExerciseIncludeSchema.optional(),
  where: SetsOfWorkoutExerciseWhereUniqueInputSchema,
  create: z.union([ SetsOfWorkoutExerciseCreateInputSchema,SetsOfWorkoutExerciseUncheckedCreateInputSchema ]),
  update: z.union([ SetsOfWorkoutExerciseUpdateInputSchema,SetsOfWorkoutExerciseUncheckedUpdateInputSchema ]),
}).strict() ;

export const SetsOfWorkoutExerciseCreateManyArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateManyArgs> = z.object({
  data: z.union([ SetsOfWorkoutExerciseCreateManyInputSchema,SetsOfWorkoutExerciseCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const SetsOfWorkoutExerciseCreateManyAndReturnArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseCreateManyAndReturnArgs> = z.object({
  data: z.union([ SetsOfWorkoutExerciseCreateManyInputSchema,SetsOfWorkoutExerciseCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const SetsOfWorkoutExerciseDeleteArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseDeleteArgs> = z.object({
  select: SetsOfWorkoutExerciseSelectSchema.optional(),
  include: SetsOfWorkoutExerciseIncludeSchema.optional(),
  where: SetsOfWorkoutExerciseWhereUniqueInputSchema,
}).strict() ;

export const SetsOfWorkoutExerciseUpdateArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateArgs> = z.object({
  select: SetsOfWorkoutExerciseSelectSchema.optional(),
  include: SetsOfWorkoutExerciseIncludeSchema.optional(),
  data: z.union([ SetsOfWorkoutExerciseUpdateInputSchema,SetsOfWorkoutExerciseUncheckedUpdateInputSchema ]),
  where: SetsOfWorkoutExerciseWhereUniqueInputSchema,
}).strict() ;

export const SetsOfWorkoutExerciseUpdateManyArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseUpdateManyArgs> = z.object({
  data: z.union([ SetsOfWorkoutExerciseUpdateManyMutationInputSchema,SetsOfWorkoutExerciseUncheckedUpdateManyInputSchema ]),
  where: SetsOfWorkoutExerciseWhereInputSchema.optional(),
}).strict() ;

export const SetsOfWorkoutExerciseDeleteManyArgsSchema: z.ZodType<Prisma.SetsOfWorkoutExerciseDeleteManyArgs> = z.object({
  where: SetsOfWorkoutExerciseWhereInputSchema.optional(),
}).strict() ;

export const StraightSetsCreateArgsSchema: z.ZodType<Prisma.StraightSetsCreateArgs> = z.object({
  select: StraightSetsSelectSchema.optional(),
  include: StraightSetsIncludeSchema.optional(),
  data: z.union([ StraightSetsCreateInputSchema,StraightSetsUncheckedCreateInputSchema ]),
}).strict() ;

export const StraightSetsUpsertArgsSchema: z.ZodType<Prisma.StraightSetsUpsertArgs> = z.object({
  select: StraightSetsSelectSchema.optional(),
  include: StraightSetsIncludeSchema.optional(),
  where: StraightSetsWhereUniqueInputSchema,
  create: z.union([ StraightSetsCreateInputSchema,StraightSetsUncheckedCreateInputSchema ]),
  update: z.union([ StraightSetsUpdateInputSchema,StraightSetsUncheckedUpdateInputSchema ]),
}).strict() ;

export const StraightSetsCreateManyArgsSchema: z.ZodType<Prisma.StraightSetsCreateManyArgs> = z.object({
  data: z.union([ StraightSetsCreateManyInputSchema,StraightSetsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const StraightSetsCreateManyAndReturnArgsSchema: z.ZodType<Prisma.StraightSetsCreateManyAndReturnArgs> = z.object({
  data: z.union([ StraightSetsCreateManyInputSchema,StraightSetsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const StraightSetsDeleteArgsSchema: z.ZodType<Prisma.StraightSetsDeleteArgs> = z.object({
  select: StraightSetsSelectSchema.optional(),
  include: StraightSetsIncludeSchema.optional(),
  where: StraightSetsWhereUniqueInputSchema,
}).strict() ;

export const StraightSetsUpdateArgsSchema: z.ZodType<Prisma.StraightSetsUpdateArgs> = z.object({
  select: StraightSetsSelectSchema.optional(),
  include: StraightSetsIncludeSchema.optional(),
  data: z.union([ StraightSetsUpdateInputSchema,StraightSetsUncheckedUpdateInputSchema ]),
  where: StraightSetsWhereUniqueInputSchema,
}).strict() ;

export const StraightSetsUpdateManyArgsSchema: z.ZodType<Prisma.StraightSetsUpdateManyArgs> = z.object({
  data: z.union([ StraightSetsUpdateManyMutationInputSchema,StraightSetsUncheckedUpdateManyInputSchema ]),
  where: StraightSetsWhereInputSchema.optional(),
}).strict() ;

export const StraightSetsDeleteManyArgsSchema: z.ZodType<Prisma.StraightSetsDeleteManyArgs> = z.object({
  where: StraightSetsWhereInputSchema.optional(),
}).strict() ;

export const FixedChangeSetsCreateArgsSchema: z.ZodType<Prisma.FixedChangeSetsCreateArgs> = z.object({
  select: FixedChangeSetsSelectSchema.optional(),
  include: FixedChangeSetsIncludeSchema.optional(),
  data: z.union([ FixedChangeSetsCreateInputSchema,FixedChangeSetsUncheckedCreateInputSchema ]),
}).strict() ;

export const FixedChangeSetsUpsertArgsSchema: z.ZodType<Prisma.FixedChangeSetsUpsertArgs> = z.object({
  select: FixedChangeSetsSelectSchema.optional(),
  include: FixedChangeSetsIncludeSchema.optional(),
  where: FixedChangeSetsWhereUniqueInputSchema,
  create: z.union([ FixedChangeSetsCreateInputSchema,FixedChangeSetsUncheckedCreateInputSchema ]),
  update: z.union([ FixedChangeSetsUpdateInputSchema,FixedChangeSetsUncheckedUpdateInputSchema ]),
}).strict() ;

export const FixedChangeSetsCreateManyArgsSchema: z.ZodType<Prisma.FixedChangeSetsCreateManyArgs> = z.object({
  data: z.union([ FixedChangeSetsCreateManyInputSchema,FixedChangeSetsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const FixedChangeSetsCreateManyAndReturnArgsSchema: z.ZodType<Prisma.FixedChangeSetsCreateManyAndReturnArgs> = z.object({
  data: z.union([ FixedChangeSetsCreateManyInputSchema,FixedChangeSetsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const FixedChangeSetsDeleteArgsSchema: z.ZodType<Prisma.FixedChangeSetsDeleteArgs> = z.object({
  select: FixedChangeSetsSelectSchema.optional(),
  include: FixedChangeSetsIncludeSchema.optional(),
  where: FixedChangeSetsWhereUniqueInputSchema,
}).strict() ;

export const FixedChangeSetsUpdateArgsSchema: z.ZodType<Prisma.FixedChangeSetsUpdateArgs> = z.object({
  select: FixedChangeSetsSelectSchema.optional(),
  include: FixedChangeSetsIncludeSchema.optional(),
  data: z.union([ FixedChangeSetsUpdateInputSchema,FixedChangeSetsUncheckedUpdateInputSchema ]),
  where: FixedChangeSetsWhereUniqueInputSchema,
}).strict() ;

export const FixedChangeSetsUpdateManyArgsSchema: z.ZodType<Prisma.FixedChangeSetsUpdateManyArgs> = z.object({
  data: z.union([ FixedChangeSetsUpdateManyMutationInputSchema,FixedChangeSetsUncheckedUpdateManyInputSchema ]),
  where: FixedChangeSetsWhereInputSchema.optional(),
}).strict() ;

export const FixedChangeSetsDeleteManyArgsSchema: z.ZodType<Prisma.FixedChangeSetsDeleteManyArgs> = z.object({
  where: FixedChangeSetsWhereInputSchema.optional(),
}).strict() ;

export const VariableChangeSetsCreateArgsSchema: z.ZodType<Prisma.VariableChangeSetsCreateArgs> = z.object({
  select: VariableChangeSetsSelectSchema.optional(),
  include: VariableChangeSetsIncludeSchema.optional(),
  data: z.union([ VariableChangeSetsCreateInputSchema,VariableChangeSetsUncheckedCreateInputSchema ]),
}).strict() ;

export const VariableChangeSetsUpsertArgsSchema: z.ZodType<Prisma.VariableChangeSetsUpsertArgs> = z.object({
  select: VariableChangeSetsSelectSchema.optional(),
  include: VariableChangeSetsIncludeSchema.optional(),
  where: VariableChangeSetsWhereUniqueInputSchema,
  create: z.union([ VariableChangeSetsCreateInputSchema,VariableChangeSetsUncheckedCreateInputSchema ]),
  update: z.union([ VariableChangeSetsUpdateInputSchema,VariableChangeSetsUncheckedUpdateInputSchema ]),
}).strict() ;

export const VariableChangeSetsCreateManyArgsSchema: z.ZodType<Prisma.VariableChangeSetsCreateManyArgs> = z.object({
  data: z.union([ VariableChangeSetsCreateManyInputSchema,VariableChangeSetsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const VariableChangeSetsCreateManyAndReturnArgsSchema: z.ZodType<Prisma.VariableChangeSetsCreateManyAndReturnArgs> = z.object({
  data: z.union([ VariableChangeSetsCreateManyInputSchema,VariableChangeSetsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const VariableChangeSetsDeleteArgsSchema: z.ZodType<Prisma.VariableChangeSetsDeleteArgs> = z.object({
  select: VariableChangeSetsSelectSchema.optional(),
  include: VariableChangeSetsIncludeSchema.optional(),
  where: VariableChangeSetsWhereUniqueInputSchema,
}).strict() ;

export const VariableChangeSetsUpdateArgsSchema: z.ZodType<Prisma.VariableChangeSetsUpdateArgs> = z.object({
  select: VariableChangeSetsSelectSchema.optional(),
  include: VariableChangeSetsIncludeSchema.optional(),
  data: z.union([ VariableChangeSetsUpdateInputSchema,VariableChangeSetsUncheckedUpdateInputSchema ]),
  where: VariableChangeSetsWhereUniqueInputSchema,
}).strict() ;

export const VariableChangeSetsUpdateManyArgsSchema: z.ZodType<Prisma.VariableChangeSetsUpdateManyArgs> = z.object({
  data: z.union([ VariableChangeSetsUpdateManyMutationInputSchema,VariableChangeSetsUncheckedUpdateManyInputSchema ]),
  where: VariableChangeSetsWhereInputSchema.optional(),
}).strict() ;

export const VariableChangeSetsDeleteManyArgsSchema: z.ZodType<Prisma.VariableChangeSetsDeleteManyArgs> = z.object({
  where: VariableChangeSetsWhereInputSchema.optional(),
}).strict() ;

export const MyorepMatchSetsCreateArgsSchema: z.ZodType<Prisma.MyorepMatchSetsCreateArgs> = z.object({
  select: MyorepMatchSetsSelectSchema.optional(),
  include: MyorepMatchSetsIncludeSchema.optional(),
  data: z.union([ MyorepMatchSetsCreateInputSchema,MyorepMatchSetsUncheckedCreateInputSchema ]),
}).strict() ;

export const MyorepMatchSetsUpsertArgsSchema: z.ZodType<Prisma.MyorepMatchSetsUpsertArgs> = z.object({
  select: MyorepMatchSetsSelectSchema.optional(),
  include: MyorepMatchSetsIncludeSchema.optional(),
  where: MyorepMatchSetsWhereUniqueInputSchema,
  create: z.union([ MyorepMatchSetsCreateInputSchema,MyorepMatchSetsUncheckedCreateInputSchema ]),
  update: z.union([ MyorepMatchSetsUpdateInputSchema,MyorepMatchSetsUncheckedUpdateInputSchema ]),
}).strict() ;

export const MyorepMatchSetsCreateManyArgsSchema: z.ZodType<Prisma.MyorepMatchSetsCreateManyArgs> = z.object({
  data: z.union([ MyorepMatchSetsCreateManyInputSchema,MyorepMatchSetsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MyorepMatchSetsCreateManyAndReturnArgsSchema: z.ZodType<Prisma.MyorepMatchSetsCreateManyAndReturnArgs> = z.object({
  data: z.union([ MyorepMatchSetsCreateManyInputSchema,MyorepMatchSetsCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MyorepMatchSetsDeleteArgsSchema: z.ZodType<Prisma.MyorepMatchSetsDeleteArgs> = z.object({
  select: MyorepMatchSetsSelectSchema.optional(),
  include: MyorepMatchSetsIncludeSchema.optional(),
  where: MyorepMatchSetsWhereUniqueInputSchema,
}).strict() ;

export const MyorepMatchSetsUpdateArgsSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateArgs> = z.object({
  select: MyorepMatchSetsSelectSchema.optional(),
  include: MyorepMatchSetsIncludeSchema.optional(),
  data: z.union([ MyorepMatchSetsUpdateInputSchema,MyorepMatchSetsUncheckedUpdateInputSchema ]),
  where: MyorepMatchSetsWhereUniqueInputSchema,
}).strict() ;

export const MyorepMatchSetsUpdateManyArgsSchema: z.ZodType<Prisma.MyorepMatchSetsUpdateManyArgs> = z.object({
  data: z.union([ MyorepMatchSetsUpdateManyMutationInputSchema,MyorepMatchSetsUncheckedUpdateManyInputSchema ]),
  where: MyorepMatchSetsWhereInputSchema.optional(),
}).strict() ;

export const MyorepMatchSetsDeleteManyArgsSchema: z.ZodType<Prisma.MyorepMatchSetsDeleteManyArgs> = z.object({
  where: MyorepMatchSetsWhereInputSchema.optional(),
}).strict() ;

export const MyorepMatchSetCreateArgsSchema: z.ZodType<Prisma.MyorepMatchSetCreateArgs> = z.object({
  select: MyorepMatchSetSelectSchema.optional(),
  include: MyorepMatchSetIncludeSchema.optional(),
  data: z.union([ MyorepMatchSetCreateInputSchema,MyorepMatchSetUncheckedCreateInputSchema ]),
}).strict() ;

export const MyorepMatchSetUpsertArgsSchema: z.ZodType<Prisma.MyorepMatchSetUpsertArgs> = z.object({
  select: MyorepMatchSetSelectSchema.optional(),
  include: MyorepMatchSetIncludeSchema.optional(),
  where: MyorepMatchSetWhereUniqueInputSchema,
  create: z.union([ MyorepMatchSetCreateInputSchema,MyorepMatchSetUncheckedCreateInputSchema ]),
  update: z.union([ MyorepMatchSetUpdateInputSchema,MyorepMatchSetUncheckedUpdateInputSchema ]),
}).strict() ;

export const MyorepMatchSetCreateManyArgsSchema: z.ZodType<Prisma.MyorepMatchSetCreateManyArgs> = z.object({
  data: z.union([ MyorepMatchSetCreateManyInputSchema,MyorepMatchSetCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MyorepMatchSetCreateManyAndReturnArgsSchema: z.ZodType<Prisma.MyorepMatchSetCreateManyAndReturnArgs> = z.object({
  data: z.union([ MyorepMatchSetCreateManyInputSchema,MyorepMatchSetCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MyorepMatchSetDeleteArgsSchema: z.ZodType<Prisma.MyorepMatchSetDeleteArgs> = z.object({
  select: MyorepMatchSetSelectSchema.optional(),
  include: MyorepMatchSetIncludeSchema.optional(),
  where: MyorepMatchSetWhereUniqueInputSchema,
}).strict() ;

export const MyorepMatchSetUpdateArgsSchema: z.ZodType<Prisma.MyorepMatchSetUpdateArgs> = z.object({
  select: MyorepMatchSetSelectSchema.optional(),
  include: MyorepMatchSetIncludeSchema.optional(),
  data: z.union([ MyorepMatchSetUpdateInputSchema,MyorepMatchSetUncheckedUpdateInputSchema ]),
  where: MyorepMatchSetWhereUniqueInputSchema,
}).strict() ;

export const MyorepMatchSetUpdateManyArgsSchema: z.ZodType<Prisma.MyorepMatchSetUpdateManyArgs> = z.object({
  data: z.union([ MyorepMatchSetUpdateManyMutationInputSchema,MyorepMatchSetUncheckedUpdateManyInputSchema ]),
  where: MyorepMatchSetWhereInputSchema.optional(),
}).strict() ;

export const MyorepMatchSetDeleteManyArgsSchema: z.ZodType<Prisma.MyorepMatchSetDeleteManyArgs> = z.object({
  where: MyorepMatchSetWhereInputSchema.optional(),
}).strict() ;