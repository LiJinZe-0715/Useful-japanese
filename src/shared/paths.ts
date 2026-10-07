export const href = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
export function isWithinRoute(pathname: string, route: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const path = (
    base && pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname
  ).replace(/\/$/, "");
  return path === route || path.startsWith(`${route}/`);
}
