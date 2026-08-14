import type { TrendStatus } from "./types";

export const TREND_STATUS_LABEL: Record<TrendStatus, string> = {
  renforce: "Se renforce",
  maintient: "Se maintient",
  affaiblit: "S'affaiblit",
  invalidee: "Invalidée",
};

export const TREND_STATUS_CLASS: Record<TrendStatus, string> = {
  renforce: "bg-teal-bg text-teal",
  maintient: "bg-line-2 text-ink-2",
  affaiblit: "bg-ochre-bg text-ochre",
  invalidee: "bg-rust-bg text-rust",
};
