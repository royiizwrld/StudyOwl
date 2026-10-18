import { useStudy } from "@/lib/store";

/** Shows a target %, masked when the student chose to hide targets. */
export function TargetValue({ value }: { value: number | null | undefined }) {
  const { gradeGoals } = useStudy();
  if (value == null) return null;
  return <span>{gradeGoals.maskTarget ? "••%" : `${value}%`}</span>;
}
