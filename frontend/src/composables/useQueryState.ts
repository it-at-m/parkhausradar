import { useRoute, useRouter } from "vue-router";

type QueryChanges = Record<string, string | undefined>;

// Shared by all components, as one click can change the query from several of them
let pendingChange: Promise<void> = Promise.resolve();

/**
 * State kept in the query of the address, so the back button closes what was opened last.
 * Opening something adds an entry to the history. Anything else replaces the current entry,
 * or goes back if the previous entry already is the target, so going back does not reopen it.
 */
export function useQueryState() {
  const route = useRoute();
  const router = useRouter();

  function get(name: string): string | null {
    const value = route.query[name];
    return typeof value === "string" ? value : null;
  }

  function back(): Promise<void> {
    return new Promise((resolve) => {
      const removeHook = router.afterEach(() => {
        removeHook();
        resolve();
      });
      router.back();
    });
  }

  async function apply(changes: QueryChanges) {
    const target = router.resolve({ query: { ...route.query, ...changes } });
    if (router.options.history.state.back === target.fullPath) {
      await back();
      return;
    }
    const opens = Object.entries(changes).some(
      ([name, value]) => value !== undefined && get(name) === null
    );
    await (opens ? router.push(target) : router.replace(target));
  }

  // Each change builds on the address left by the previous one, which is still pending otherwise
  function change(changes: QueryChanges): Promise<void> {
    const applied = pendingChange.then(() => apply(changes));
    pendingChange = applied.catch(() => undefined);
    return applied;
  }

  return { get, change };
}
