// ---------- Material 3 color schemes ----------
// Neutrals are shared across schemes (as in real M3, seed color mostly
// affects primary/secondary tones, not the neutral surfaces).

const NEUTRALS = {
  light: {
    surface: "#FFFBFF", onSurface: "#1C1B1F",
    surfaceVariant: "#E6E0E9", onSurfaceVariant: "#49454F",
    outline: "#79747E", background: "#FFFBFF", onBackground: "#1C1B1F",
    surfaceContainer: "#F2ECF4", surfaceContainerHigh: "#ECE6EF",
    error: "#BA1A1A", onError: "#FFFFFF",
  },
  dark: {
    surface: "#141218", onSurface: "#E6E1E5",
    surfaceVariant: "#49454F", onSurfaceVariant: "#CAC4D0",
    outline: "#938F99", background: "#141218", onBackground: "#E6E1E5",
    surfaceContainer: "#211F26", surfaceContainerHigh: "#2B2930",
    error: "#FFB4AB", onError: "#690005",
  },
};

const SCHEMES = {
  purple: { label: "Purple", swatch: "#6750A4",
    light: { primary: "#6750A4", onPrimary: "#FFFFFF", primaryContainer: "#EADDFF", onPrimaryContainer: "#21005D", secondaryContainer: "#E8DEF8", onSecondaryContainer: "#1D192B" },
    dark:  { primary: "#D0BCFF", onPrimary: "#381E72", primaryContainer: "#4F378B", onPrimaryContainer: "#EADDFF", secondaryContainer: "#4A4458", onSecondaryContainer: "#E8DEF8" } },
  red: { label: "Red", swatch: "#BB3E32",
    light: { primary: "#BB3E32", onPrimary: "#FFFFFF", primaryContainer: "#FFDAD4", onPrimaryContainer: "#410E0B", secondaryContainer: "#FFDAD4", onSecondaryContainer: "#410E0B" },
    dark:  { primary: "#FFB4A8", onPrimary: "#690600", primaryContainer: "#8C1D14", onPrimaryContainer: "#FFDAD4", secondaryContainer: "#5D3F3A", onSecondaryContainer: "#FFDAD4" } },
  blue: { label: "Blue", swatch: "#415F91",
    light: { primary: "#415F91", onPrimary: "#FFFFFF", primaryContainer: "#D6E3FF", onPrimaryContainer: "#001B3E", secondaryContainer: "#DBE3F9", onSecondaryContainer: "#131C2B" },
    dark:  { primary: "#AAC7FF", onPrimary: "#0A305F", primaryContainer: "#284777", onPrimaryContainer: "#D6E3FF", secondaryContainer: "#3B4858", onSecondaryContainer: "#D7E3F8" } },
  green: { label: "Green", swatch: "#3B6939",
    light: { primary: "#3B6939", onPrimary: "#FFFFFF", primaryContainer: "#BCF0B4", onPrimaryContainer: "#002204", secondaryContainer: "#D7E8D0", onSecondaryContainer: "#101F10" },
    dark:  { primary: "#A1D399", onPrimary: "#0A390E", primaryContainer: "#235023", onPrimaryContainer: "#BCF0B4", secondaryContainer: "#3B4A3C", onSecondaryContainer: "#D7E8D0" } },
  orange: { label: "Orange", swatch: "#8B5000",
    light: { primary: "#8B5000", onPrimary: "#FFFFFF", primaryContainer: "#FFDDB1", onPrimaryContainer: "#2B1700", secondaryContainer: "#F6DEC9", onSecondaryContainer: "#251A0A" },
    dark:  { primary: "#FFB868", onPrimary: "#4A2800", primaryContainer: "#6A3C00", onPrimaryContainer: "#FFDDB1", secondaryContainer: "#55432D", onSecondaryContainer: "#F6DEC9" } },
  teal: { label: "Teal", swatch: "#006A68",
    light: { primary: "#006A68", onPrimary: "#FFFFFF", primaryContainer: "#9CF1EC", onPrimaryContainer: "#00201F", secondaryContainer: "#CCE8E6", onSecondaryContainer: "#051F1E" },
    dark:  { primary: "#80D5D1", onPrimary: "#003736", primaryContainer: "#004F4E", onPrimaryContainer: "#9CF1EC", secondaryContainer: "#334B4A", onSecondaryContainer: "#CCE8E6" } },
  pink: { label: "Pink", swatch: "#984061",
    light: { primary: "#984061", onPrimary: "#FFFFFF", primaryContainer: "#FFD9E3", onPrimaryContainer: "#3E001D", secondaryContainer: "#F6DCE3", onSecondaryContainer: "#2A1520" },
    dark:  { primary: "#FFB0C8", onPrimary: "#5E1133", primaryContainer: "#7A2949", onPrimaryContainer: "#FFD9E3", secondaryContainer: "#533541", onSecondaryContainer: "#F6DCE3" } },
};

const ThemeManager = {
  STORAGE_KEY: "tasks_theme_prefs",

  getPrefs() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || { mode: "system", scheme: "purple" };
    } catch (e) {
      return { mode: "system", scheme: "purple" };
    }
  },

  savePrefs(prefs) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
  },

  resolvedMode(mode) {
    if (mode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return mode;
  },

  apply(prefs) {
    const mode = this.resolvedMode(prefs.mode);
    const scheme = SCHEMES[prefs.scheme] || SCHEMES.purple;
    const tokens = { ...NEUTRALS[mode], ...scheme[mode] };
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, value]) => {
      const cssVar = "--md-" + key.replace(/([A-Z])/g, "-$1").toLowerCase();
      root.style.setProperty(cssVar, value);
    });
    root.setAttribute("data-mode", mode);
    root.setAttribute("data-scheme", prefs.scheme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tokens.primary);
  },

  init() {
    const prefs = this.getPrefs();
    this.apply(prefs);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (this.getPrefs().mode === "system") this.apply(this.getPrefs());
    });
    return prefs;
  },

  setMode(mode) {
    const prefs = this.getPrefs();
    prefs.mode = mode;
    this.savePrefs(prefs);
    this.apply(prefs);
  },

  setScheme(scheme) {
    const prefs = this.getPrefs();
    prefs.scheme = scheme;
    this.savePrefs(prefs);
    this.apply(prefs);
  },
};

ThemeManager.init();
