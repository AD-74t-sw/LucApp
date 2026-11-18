import type { ComponentProps } from "react";
import { Select } from "@/shared/ui";
import type { CategoryNode } from "../domain/category";

/** Category picker grouped by parent: the parent itself and each subcategory are selectable. */
export function CategorySelect({
  tree,
  placeholder = "Selecciona una categoría",
  ...props
}: ComponentProps<typeof Select> & { tree: readonly CategoryNode[]; placeholder?: string }) {
  return (
    <Select {...props}>
      <option value="">{placeholder}</option>
      {tree.map((parent) =>
        parent.children.length === 0 ? (
          <option key={parent.id} value={parent.id}>
            {parent.name}
          </option>
        ) : (
          <optgroup key={parent.id} label={parent.name}>
            <option value={parent.id}>{parent.name} (general)</option>
            {parent.children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </Select>
  );
}
