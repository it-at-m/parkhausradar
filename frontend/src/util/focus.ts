// Closed details leave the focus on the body, or still inside them while they fade out
export function isFocusInClosedDetails(): boolean {
  const focused = document.activeElement;
  return (
    !focused ||
    focused === document.body ||
    focused.closest("[data-garage-details]") !== null
  );
}

// The focused link of the previous page disappears with it, keyboard and screen reader users continue at the
// heading of the new page. Panels that move the focus to themselves when shown keep it.
export function focusPageHeading(heading: HTMLElement | null): void {
  if (heading && document.activeElement === document.body) {
    heading.focus({ preventScroll: true });
  }
}
