// Closed details leave the focus on the body, or still inside them while they fade out
export function isFocusInClosedDetails(): boolean {
  const focused = document.activeElement;
  return (
    !focused ||
    focused === document.body ||
    focused.closest("[data-garage-details]") !== null
  );
}
