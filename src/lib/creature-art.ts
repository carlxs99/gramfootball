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

const thumbnailModules = import.meta.glob<string>(
  ["../assets/card-thumbnails/creatures/*.webp", "../assets/card-thumbnails/trainers/*.webp"],
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

export const CREATURE_THUMBNAILS: Record<string, string> = Object.fromEntries(
  Object.entries(thumbnailModules).map(([path, url]) => [
    path.split("/").at(-1)?.replace(".webp", "") ?? path,
    url,
  ]),
);

const mediumModules = import.meta.glob<string>(
  ["../assets/card-medium/creatures/*.webp", "../assets/card-medium/trainers/*.webp"],
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

export const CREATURE_MEDIUM: Record<string, string> = Object.fromEntries(
  Object.entries(mediumModules).map(([path, url]) => [
    path.split("/").at(-1)?.replace(".webp", "") ?? path,
    url,
  ]),
);
