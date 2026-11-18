"use client";

import { Search } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { Input, cn } from "@/shared/ui";
import type { FoodIconKey } from "../domain/food-icons";
import { FOOD_ICONS, FOOD_ICON_GROUPS, FoodIcon, type IconEntry } from "./food-icons";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Icon chooser for the food form: a grid of radio buttons named `name`, by
 * group, with a search box. "Sin ícono" sends an empty value.
 */
export function FoodIconPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: FoodIconKey | null;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodIconKey | "">(defaultValue ?? "");
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const matches = (Object.entries(FOOD_ICONS) as [FoodIconKey, IconEntry][]).filter(([, entry]) => {
    const haystack = normalize(`${entry.label} ${entry.keywords ?? ""} ${entry.group}`);
    return words.every((word) => haystack.includes(word));
  });

  const tile = (key: FoodIconKey | "", label: string, content: ReactNode) => (
    <label
      key={key || "none"}
      title={label}
      className={cn(
        "border-border hover:bg-surface-muted relative flex aspect-square cursor-pointer items-center justify-center rounded-xs border transition",
        "has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2",
        selected === key && "border-accent bg-accent-soft text-accent",
      )}
    >
      <input
        type="radio"
        name={name}
        value={key}
        checked={selected === key}
        onChange={() => setSelected(key)}
        className="sr-only"
        aria-label={label}
      />
      {content}
    </label>
  );

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">Ícono</legend>
      <div className="relative">
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar: pollo, palta, leche…"
          aria-label="Buscar ícono"
          className="pl-9"
          // Enter in the search box must not submit the food form.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        />
      </div>
      <div className="max-h-56 overflow-y-auto pr-1">
        {words.length > 0 ? (
          matches.length > 0 ? (
            <div className="grid grid-cols-7 gap-1.5 @md:grid-cols-10">
              {matches.map(([key, entry]) =>
                tile(key, entry.label, <FoodIcon icon={key} className="size-5" />),
              )}
            </div>
          ) : (
            <p className="text-muted py-4 text-center text-sm">Ningún ícono coincide.</p>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-7 gap-1.5 @md:grid-cols-10">
              {tile("", "Sin ícono", <span className="text-muted text-[10px]">Ninguno</span>)}
            </div>
            {FOOD_ICON_GROUPS.map((group) => (
              <div key={group} className="flex flex-col gap-1.5">
                <p className="eyebrow text-[0.6875rem]">{group}</p>
                <div className="grid grid-cols-7 gap-1.5 @md:grid-cols-10">
                  {matches
                    .filter(([, entry]) => entry.group === group)
                    .map(([key, entry]) =>
                      tile(key, entry.label, <FoodIcon icon={key} className="size-5" />),
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* While searching, the chosen icon may be filtered out: keep sending it. */}
      {words.length > 0 && selected && !matches.some(([key]) => key === selected) ? (
        <input type="hidden" name={name} value={selected} />
      ) : null}
    </fieldset>
  );
}
