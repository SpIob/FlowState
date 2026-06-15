export interface GitFileStatus {
  path: string;
  status: string; // Comma-separated statuses (e.g., "modified", "untracked,modified")
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: number; // Unix epoch seconds
}