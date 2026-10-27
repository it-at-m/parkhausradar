// Shared links open the map with the details of the garage
export const GARAGE_LINK_QUERY = "garage";

export function getGarageLink(pNumber: string): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.searchParams.set(GARAGE_LINK_QUERY, pNumber);
  return url.href;
}
