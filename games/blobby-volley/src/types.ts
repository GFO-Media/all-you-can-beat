export type BlobbyVolleyPhase = "intro" | "playing" | "point" | "ended";

export interface BlobView {
  id: string;
  sessionId: string;
  name: string;
  color: string;
  team: 0 | 1;
  x: number;
  y: number;
  r: number;
}

export interface BallView {
  x: number;
  y: number;
  r: number;
}

export interface TeamScoreView {
  team: 0 | 1;
  score: number;
  playerNames: string[];
}

export interface BlobbyVolleyState {
  phase: BlobbyVolleyPhase;
  /** Normalized court dimensions the client uses for rendering. */
  court: { w: number; h: number; groundY: number; netX: number; netTop: number };
  blobs: BlobView[];
  ball: BallView;
  ballFloating: boolean;
  scores: [number, number];
  pointsToWin: number;
  lastPointTeam: 0 | 1 | null;
  yourTeam: 0 | 1;
  yourBlobId: string | null;
  teams: [TeamScoreView, TeamScoreView];
}
