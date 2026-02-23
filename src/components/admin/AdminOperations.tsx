"use client";

import { type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Crosshair, Shuffle, Swords, Trophy } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

type ControlCard = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const controlCards: ControlCard[] = [
  {
    title: "Create tournament",
    description: "Open a new event and prepare the bracket flow.",
    icon: Trophy,
  },
  {
    title: "Payment check",
    description: "Approve paid teams before they can be seeded.",
    icon: CreditCard,
  },
  {
    title: "Shuffle seed",
    description: "Randomize initial matchups for fair placement.",
    icon: Shuffle,
  },
  {
    title: "Resolve winners",
    description: "Set scores and advance winning teams to next rounds.",
    icon: Swords,
  },
];

const teamPool = [
  "Crimson Valkyries",
  "Void Pulse",
  "Iron Wraiths",
  "Vortex Seraphs",
  "Neon Requiem",
  "Ashborne Syndicate",
];

const shuffleArray = <T,>(input: T[]) => {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const randomPair = () => {
  const first = teamPool[Math.floor(Math.random() * teamPool.length)];
  let second = teamPool[Math.floor(Math.random() * teamPool.length)];
  if (second === first) {
    second = teamPool[(teamPool.indexOf(first) + 1) % teamPool.length];
  }
  return { first, second };
};

export function AdminOperations() {
  const [deck, setDeck] = useState(controlCards);
  const [featuredPair, setFeaturedPair] = useState({
    first: teamPool[0],
    second: teamPool[1] ?? teamPool[0],
  });
  const [seedStamp, setSeedStamp] = useState("-");
  const highlightCards = useMemo(() => deck.slice(0, 3), [deck]);

  const handleShuffle = useCallback(() => {
    setDeck(shuffleArray(controlCards));
    setFeaturedPair(randomPair());
    setSeedStamp(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleShuffle();
    }, 0);
    return () => clearTimeout(timer);
  }, [handleShuffle]);

  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-amber-500/40 bg-[#15171b]/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Crosshair className="h-5 w-5 text-amber-200" />
            <CardTitle>Live operations</CardTitle>
            <Badge className="text-[0.55rem] uppercase tracking-[0.3em] text-zinc-200">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-200/80">
            Shuffle cards for quick control simulation, then push real updates from tournament detail pages.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={handleShuffle}>
              <Shuffle className="mr-2 h-4 w-4" />
              Shuffle control cards
            </Button>
            <Badge className="rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-zinc-100">
              {seedStamp}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {highlightCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="rounded-2xl border border-amber-500/30 bg-black/40 p-4">
                  <Icon className="h-4 w-4 text-amber-200" />
                  <p className="mt-2 text-lg font-semibold text-zinc-100">{card.title}</p>
                  <p className="text-sm text-zinc-200/80">{card.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-amber-500/40 bg-[#15171b]/70">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-amber-200" />
            <CardTitle className="text-base">Random matchup</CardTitle>
          </div>
          <CardDescription className="text-sm text-zinc-200/70">
            Pick two teams and use this as a quick pairing preview before starting the real bracket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-300/70">Selected pair</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-100">{featuredPair.first}</p>
              <span className="text-xs text-zinc-200/80">VS</span>
              <p className="text-sm text-zinc-100">{featuredPair.second}</p>
            </div>
            <Badge className="mt-3 block rounded-full border border-amber-500/30 bg-amber-500/35 px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-zinc-100">
              Matched
            </Badge>
          </div>
          <div className="flex flex-col gap-2 text-sm text-zinc-200/80">
            <p>Click shuffle to rotate operation cards and generate new pairs.</p>
            <p>Final bracket progression still runs from the tournament detail control tab.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
