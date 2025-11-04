export type AnswerLetter = "A" | "B" | "C" | "D";

export interface Question {
  id: string;
  points: number;
  prompt: string;
  options: Record<AnswerLetter, string>;
  answer: AnswerLetter;
}

export type BoardStatus = "unplayed" | "correct" | "wrong";

export interface BoardCell {
  qid: string;
  points: number;
  status: BoardStatus;
  index: number;
}

export interface PlayerState {
  id: string;
  name: string;
  score: number;
}

export interface Game {
  id: string;
  hostSessionId: string;
  players: Record<string, PlayerState>;
  questions: Question[];
  board: Record<string, BoardCell>;
  currentQuestionId?: string;
}
