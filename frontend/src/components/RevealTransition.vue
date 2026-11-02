<template>
  <transition
    :css="false"
    @enter="enter"
    @enter-cancelled="cancel"
    @leave="leave"
    @leave-cancelled="cancel"
  >
    <slot />
  </transition>
</template>

<script setup lang="ts">
// Grows the panel out of the target and shrinks it back into it, Vuetify passes the target as to its own transitions
const props = defineProps<{
  target?: HTMLElement | [number, number];
}>();

// Emphasized easing of Material Design, decelerating when opening and accelerating when closing
const ENTER: KeyframeAnimationOptions = {
  duration: 350,
  easing: "cubic-bezier(0.05, 0.7, 0.1, 1)",
};
const LEAVE: KeyframeAnimationOptions = {
  duration: 200,
  easing: "cubic-bezier(0.3, 0, 0.8, 0.15)",
};
// The clip extends past the element at the end, so the shadow of the card does not appear abruptly
const SHADOW_SPACE = 32;

let animation: Animation | undefined;

function clipPaths(element: HTMLElement, target: HTMLElement): string[] {
  const box = element.getBoundingClientRect();
  const origin = target.getBoundingClientRect();
  const card = element.querySelector(".v-card") ?? element;
  const radius = Number.parseFloat(getComputedStyle(card).borderTopLeftRadius);
  return [
    `inset(${origin.top - box.top}px ${box.right - origin.right}px ${box.bottom - origin.bottom}px ${origin.left - box.left}px round ${origin.height / 2}px)`,
    `inset(-${SHADOW_SPACE}px round ${radius + SHADOW_SPACE}px)`,
  ];
}

function animate(
  element: Element,
  done: () => void,
  timing: KeyframeAnimationOptions,
  reverse: boolean
) {
  const { target } = props;
  if (
    !(element instanceof HTMLElement) ||
    !(target instanceof HTMLElement) ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    done();
    return;
  }
  const keyframes = clipPaths(element, target);
  animation = element.animate(
    { clipPath: reverse ? keyframes.reverse() : keyframes },
    timing
  );
  animation.addEventListener("finish", done);
}

function enter(element: Element, done: () => void) {
  animate(element, done, ENTER, false);
}

function leave(element: Element, done: () => void) {
  animate(element, done, LEAVE, true);
}

function cancel() {
  animation?.cancel();
}
</script>
