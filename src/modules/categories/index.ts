// Public server API of the categories module.
export {
  CATEGORY_KINDS,
  COST_TYPES,
  NECESSITIES,
  buildTree,
  resolveClassification,
  type Category,
  type CategoryKind,
  type CategoryNode,
  type Classification,
  type CostType,
  type Necessity,
} from "./domain/category";
export {
  getCategory,
  getCategoryTree,
  getCategoryWithParent,
  listCategories,
} from "./application/category-queries";
export { createDefaultCategories } from "./application/manage-categories";
