import type { CSSProperties } from "react";

/** Inline style that also allows CSS custom properties like '--r'. */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;
