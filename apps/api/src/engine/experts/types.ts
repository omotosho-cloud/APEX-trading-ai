import type { Direction } from "@apex/types";

export type ExpertOutput = {
  direction: Direction;
  confidence: number;
  reasoning: string;
};

export type ExpertName = "technical" | "macro" | "quant" | "htf_fvg" | "multi_tf" | "pullback_poi";
