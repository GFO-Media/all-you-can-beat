export type QuickDrawPhase = "intro" | "drawing" | "reveal";

export interface QuickDrawScoreView {
  sessionId: string;
  name: string;
  color: string;
  avatar: number;
  points: number;
}

export interface QuickDrawState {
  phase: QuickDrawPhase;
  round: number;
  totalRounds: number;
  drawerId: string;
  drawerName: string;
  /** The real word for the drawer (and everyone during reveal), masked otherwise. */
  word: string;
  isDrawer: boolean;
  timeLeft: number;
  scores: QuickDrawScoreView[];
  solvedByName: string | null;
}

/** game:event payloads */
export interface StrokeEvent {
  type: "stroke";
  id: string;
  color: string;
  size: number;
  /** Normalized 0..1 coordinates. */
  pts: [number, number][];
}

export interface ChatEvent {
  type: "chat";
  name: string;
  color: string;
  text: string;
  correct: boolean;
}
