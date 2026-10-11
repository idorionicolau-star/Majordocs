import { loadFont } from "@remotion/fonts";
import { Easing, staticFile } from "remotion";

// Fontes guardadas no projecto: o render não depende da internet.
export const brandFont = "Nunito"; // logótipo
export const displayFont = "Sora"; // títulos
export const textFont = "Lato"; // texto corrido / slogan

loadFont({
  family: brandFont,
  url: staticFile("Nunito.woff2"),
  weight: "200 1000",
});
loadFont({
  family: displayFont,
  url: staticFile("Sora.woff2"),
  weight: "100 800",
});
loadFont({
  family: textFont,
  url: staticFile("Lato-400.woff2"),
  weight: "400",
});
loadFont({
  family: textFont,
  url: staticFile("Lato-700.woff2"),
  weight: "700",
});

export const C = {
  blue: "#0a47a8", // azul do logótipo
  blueDeep: "#041a45",
  navy: "#020d26",
  cyan: "#19c8ff",
  white: "#ffffff",
  red: "#c4442f",
  charcoal: "#32353b",
  stone: "#cfd2d6",
  grout: "#101216",
  green: "#25d366",
};

export type Palette = readonly [string, string, string];
export const PAVE_CLASSIC: Palette = ["#cf5a43", "#2f3238", "#d6d8db"];
export const PAVE_MONO: Palette = ["#d9dbde", "#4a4e55", "#171a1f"];
export const PAVE_WARM: Palette = ["#e07a5f", "#b8bcc2", "#2f3238"];
export const PAVE_BRAND: Palette = ["#1f6fe0", "#0a47a8", "#06306f"];

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeBack = Easing.bezier(0.34, 1.56, 0.64, 1);
