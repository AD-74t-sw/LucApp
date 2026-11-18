"use client";

import Image from "next/image";
import { type KeyboardEvent, useId, useMemo, useState } from "react";
import { Input, cn } from "@/shared/ui";
import {
  INSTITUTION_KIND_LABELS,
  type Institution,
  type InstitutionKind,
  findInstitution,
  searchInstitutions,
} from "../domain/institutions";

const KIND_ORDER: readonly InstitutionKind[] = ["BANK", "CARD", "WALLET", "COOPERATIVE"];

/**
 * Searchable list of Chilean institutions with their logos. Any text is
 * accepted too ("Otra institución"), so nothing is ever blocked by the catalog.
 * Accessible combobox: arrows move, Enter picks, Escape closes.
 */
export function InstitutionPicker({
  id,
  name,
  defaultValue,
  invalid,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  invalid?: boolean;
}) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  // What the person typed to filter; cleared after picking so reopening shows everything.
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    const found = searchInstitutions(query);
    return KIND_ORDER.flatMap((kind) => found.filter((i) => i.kind === kind));
  }, [query]);
  const selected = findInstitution(value);

  const pick = (institution: Institution) => {
    setValue(institution.name);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && options[active]) {
      event.preventDefault();
      pick(options[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        {selected ? (
          <Image
            src={selected.logo}
            alt=""
            width={20}
            height={20}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          />
        ) : null}
        <Input
          id={id}
          name={name}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && options[active] ? `${listId}-${options[active].id}` : undefined
          }
          aria-invalid={invalid || undefined}
          autoComplete="off"
          maxLength={60}
          placeholder="Busca tu banco o tarjeta…"
          value={value}
          className={cn(selected && "pl-10")}
          onChange={(event) => {
            setValue(event.target.value);
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="border-border bg-surface absolute z-30 mt-1 max-h-72 w-full overflow-y-auto border shadow-sm"
        >
          {options.length === 0 ? (
            <li className="text-muted px-3 py-2 text-sm">
              No está en la lista: se guardará como “{value}”.
            </li>
          ) : null}
          {options.map((institution, index) => {
            const firstOfKind = index === 0 || options[index - 1]!.kind !== institution.kind;
            return (
              <li key={institution.id} role="presentation">
                {firstOfKind ? (
                  <p className="eyebrow bg-surface-muted px-3 py-1.5">
                    {INSTITUTION_KIND_LABELS[institution.kind]}
                  </p>
                ) : null}
                <div
                  id={`${listId}-${institution.id}`}
                  role="option"
                  aria-selected={index === active}
                  // mousedown (not click) so the input does not blur and close the list first
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(institution);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm",
                    index === active && "bg-accent-soft",
                  )}
                >
                  <span className="border-border flex size-7 shrink-0 items-center justify-center border bg-white">
                    <Image src={institution.logo} alt="" width={20} height={20} />
                  </span>
                  <span className="flex-1">{institution.name}</span>
                  {institution.note ? (
                    <span className="text-muted text-xs">{institution.note}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
