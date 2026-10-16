export type Priority = "low" | "medium" | "high";
export type TopicStatus = "not_started" | "studying" | "understood";
export type TimerMode = "focus" | "short" | "long";

export interface Subject {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  examDate?: string | null; // yyyy-MM-dd
  sample?: boolean;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  priority: Priority;
  dueDate: string | null; // yyyy-MM-dd
  status: TopicStatus;
  flagged: boolean;
  flaggedAt: number | null;
  understoodAt?: number | null;
  reviewStage?: number; // spaced reviews done (0-3)
  createdAt: number;
  sample?: boolean;
}

export interface Task {
  id: string;
  title: string;
  subjectId: string | null;
  priority: Priority;
  dueDate: string | null;
  done: boolean;
  createdAt: number;
  sample?: boolean;
}

export interface FocusSession {
  id: string;
  subjectId: string | null;
  topicId: string | null;
  startedAt: number;
  endedAt: number;
  minutes: number;
  completed: boolean;
  sample?: boolean;
}

export interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreakEnabled: boolean;
  longBreak: number;
  longBreakEvery: number;
  autoStart: boolean;
  muted: boolean;
}

export interface StudyData {
  subjects: Subject[];
  topics: Topic[];
  tasks: Task[];
  sessions: FocusSession[];
  settings: TimerSettings;
  dailyGoal: number;
  scores: TestScore[];
}

export type ScoreType = "major_exam" | "practice_test" | "cat" | "quiz";

export interface TestScore {
  id: string;
  subjectId: string;
  title: string;
  type: ScoreType;
  score: number;
  outOf: number;
  date: string; // yyyy-MM-dd
  notes?: string;
  sample?: boolean;
}

export const SCORE_TYPE_LABEL: Record<ScoreType, string> = {
  major_exam: "Major exam",
  practice_test: "Practice test",
  cat: "School CAT",
  quiz: "Quiz",
};

export const STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: "Not started",
  studying: "Studying",
  understood: "Understood",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const SUBJECT_COLORS = [
  "oklch(0.6 0.09 150)",
  "oklch(0.65 0.13 40)",
  "oklch(0.6 0.1 240)",
  "oklch(0.72 0.13 80)",
  "oklch(0.6 0.12 320)",
  "oklch(0.62 0.1 200)",
  "oklch(0.58 0.14 20)",
  "oklch(0.55 0.05 260)",
];

export const colorAt = (i: number): string => SUBJECT_COLORS[((i % SUBJECT_COLORS.length) + SUBJECT_COLORS.length) % SUBJECT_COLORS.length] ?? "oklch(0.6 0.09 150)";
