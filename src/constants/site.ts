export type NavItem = {
  title: string;
  href: string;
};

export const siteConfig = {
  name: "UFE CS2 Tournament",
  description:
    "UFE students register teams, enter tournaments through captain approvals, and follow bracket progression in a CS2-style campus platform.",
  navMenu: [
    { title: "Home", href: "/" },
    { title: "Tournament", href: "/tournament" },
  ] satisfies NavItem[],
  hero: {
    eyebrow: "UFE University League",
    title: "Build your squad and climb the UFE CS2 bracket.",
    subtitle:
      "Create a squad, join tournaments through captain requests, and track each round in real-time.",
  },
};
