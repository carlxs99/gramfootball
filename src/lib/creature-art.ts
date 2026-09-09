const modules = import.meta.glob<string>(
  ["../assets/creatures/*.webp", "../assets/trainers/*.webp"],
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

export const CREATURE_ART: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [
    path.split("/").at(-1)?.replace(".webp", "") ?? path,
    url,
  ]),
);
