export type PaletteId =
  | "orcacast_classic"
  | "amethyst"
  | "rose_noir"
  | "basalt_fire"
  | "cividis_safe"
  | "forest_greens";

export type PaletteDef = {
  id: PaletteId;
  name: string;
  colors: string[];
  dominant: string;
};

export const DEFAULT_PALETTE_ID: PaletteId = "orcacast_classic";

export const PALETTES: Record<PaletteId, PaletteDef> = {
  orcacast_classic: {
    id: "orcacast_classic",
    name: "OrcaCast Classic",
    colors: [
      "#002BFB",
      "#0466FF",
      "#049FFF",
      "#00CEFD",
      "#00E1EB",
      "#00EBB6",
      "#00EBDD",
      "#C1FFFA",
    ],
    dominant: "#00E1EB",
  },
  amethyst: {
    id: "amethyst",
    name: "Amethyst",
    colors: [
      "#10002B",
      "#240046",
      "#3C096C",
      "#5A189A",
      "#7B2CBF",
      "#9D4EDD",
      "#C77DFF",
      "#E0AAFF",
    ],
    dominant: "#9D4EDD",
  },
  rose_noir: {
    id: "rose_noir",
    name: "Rose Noir",
    colors: [
      "#590D22",
      "#800F2F",
      "#A4133C",
      "#C9184A",
      "#FF4D6D",
      "#FF758F",
      "#FF8FA3",
      "#FFCCD5",
    ],
    dominant: "#FF4D6D",
  },
  basalt_fire: {
    id: "basalt_fire",
    name: "Basalt & Fire",
    colors: [
      "#03071E",
      "#370617",
      "#6A040F",
      "#9D0208",
      "#D00000",
      "#E85D04",
      "#F48C06",
      "#FFBA08",
    ],
    dominant: "#E85D04",
  },
  cividis_safe: {
    id: "cividis_safe",
    name: "Cividis Safe",
    colors: [
      "#00204C",
      "#283A90",
      "#3F5597",
      "#556F8E",
      "#6F8A7E",
      "#8FA56B",
      "#BCCB4C",
      "#FDE945",
    ],
    dominant: "#8FA56B",
  },
  forest_greens: {
    id: "forest_greens",
    name: "Forest Greens",
    colors: [
      "#081C15",
      "#1B4332",
      "#2D6A4F",
      "#3C7A5E",
      "#4F936D",
      "#74A57F",
      "#95BC8F",
      "#B7D8A6",
    ],
    dominant: "#4F936D",
  },
};

export function getPalette(paletteId: PaletteId): PaletteDef {
  return PALETTES[paletteId];
}

export function getPaletteOrDefault(paletteId: string | null | undefined): PaletteDef {
  if (!paletteId) return PALETTES[DEFAULT_PALETTE_ID];
  return PALETTES[paletteId as PaletteId] ?? PALETTES[DEFAULT_PALETTE_ID];
}

if (import.meta.env.DEV) {
  Object.values(PALETTES).forEach((palette) => {
    if (palette.colors.length !== 8) {
      const message = `[palettes] Palette "${palette.id}" must define exactly 8 colors, got ${palette.colors.length}.`;
       
      console.warn(message);
      throw new Error(message);
    }
  });
}
