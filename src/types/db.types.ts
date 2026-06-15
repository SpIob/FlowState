export interface AppStateEntry {
  key: string;
  value: string;
}

export interface SessionLog {
  id: number;
  started_at: string; // ISO 8601 string or formatted date
  ended_at: string | null;
}