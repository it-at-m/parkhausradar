import { useRoute, useRouter } from "vue-router";

type QueryChanges = Record<string, string | undefined>;

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

  async function change(changes: QueryChanges) {
    const target = router.resolve({ query: { ...route.query, ...changes } });
    if (router.options.history.state.back === target.fullPath) {
      router.back();
      return;
    }
    const opens = Object.entries(changes).some(
      ([name, value]) => value !== undefined && get(name) === null
    );
    await (opens ? router.push(target) : router.replace(target));
  }

  return { get, change };
}
