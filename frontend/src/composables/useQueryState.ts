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

  // A cancelled navigation also reaches afterEach, with the failure as its third argument
  function back(target: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const removeAfterEach = router.afterEach((to) => {
        if (to.fullPath === target) {
          removeHooks();
          resolve();
        }
      });
      const removeOnError = router.onError((error, to) => {
        if (to.fullPath === target) {
          removeHooks();
          reject(error);
        }
      });
      function removeHooks() {
        removeAfterEach();
        removeOnError();
      }
      router.back();
    });
  }

  async function apply(changes: QueryChanges) {
    const target = router.resolve({ query: { ...route.query, ...changes } });
    if (router.options.history.state.back === target.fullPath) {
      await back(target.fullPath);
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
