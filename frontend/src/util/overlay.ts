// Vuetify closes its own overlays on Escape too, so one press must only close the topmost layer
export function isOverlayOpen(): boolean {
  return (
    document.querySelector(
      ".v-overlay--active:not(.v-snackbar):not(.v-tooltip)"
    ) !== null
  );
}
