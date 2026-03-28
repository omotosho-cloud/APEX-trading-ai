import type { Direction } from "@apex/types";

export type ExpertOutput = {
  direction: Direction;
  confidence: number;
  reasoning: string;
};

export type ExpertName = "technical" | "smart_money" | "sentiment" | "macro" | "quant";
