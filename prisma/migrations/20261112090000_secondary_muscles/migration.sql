-- AlterEnum
ALTER TYPE "MuscleGroup" ADD VALUE 'WholeBody';

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "secondaryMuscleGroups" "MuscleGroup"[] DEFAULT ARRAY[]::"MuscleGroup"[];

-- AlterTable
ALTER TABLE "ExerciseTemplate" ADD COLUMN     "secondaryMuscleGroups" "MuscleGroup"[] DEFAULT ARRAY[]::"MuscleGroup"[];

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "secondaryMuscleGroups" "MuscleGroup"[] DEFAULT ARRAY[]::"MuscleGroup"[];
