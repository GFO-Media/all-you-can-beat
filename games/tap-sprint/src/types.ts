export type TapSprintPhase = "intro" | "ready" | "go" | "round-results";

export interface TapSprintPlayerView {
  sessionId: string;
  name: string;
  color: string;
  avatar: number;
  reaction: number | null;
  falseStart: boolean;
  roundPoints: number;
  totalPoints: number;
}

export interface TapSprintState {
  phase: TapSprintPhase;
  round: number;
  totalRounds: number;
  players: TapSprintPlayerView[];
  you: {
    tapped: boolean;
    falseStart: boolean;
    reaction: number | null;
  };
}
