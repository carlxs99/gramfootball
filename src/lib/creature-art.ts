const modules = import.meta.glob<string>(["../assets/creatures/*.png", "../assets/trainers/*.png"], {
  eager: true,
  import: "default",
  query: "?url",
});

export const CREATURE_ART: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [
    path.split("/").pop()!.replace(".png", ""),
    url,
  ]),
);
