export const RECENT_LINKS_KEY = "hk_aiedu_recent_links_v1";
export const COMMAND_PALETTE_OPEN_EVENT = "hk-command-palette:open";

export function emitOpenCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
}
