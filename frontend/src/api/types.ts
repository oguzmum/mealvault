export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export type DishSource = "user" | "imported";

export type ShoppingCategory =
  | "produce"
  | "dairy"
  | "meat_fish"
  | "pantry"
  | "frozen"
  | "other";

export interface DishListItem {
  id: number;
  name: string;
  cook_time_minutes: number | null;
  kcal: number | null;
  image_path: string | null;
  source: DishSource;
  tags: Tag[];
}

export interface DishIngredient {
  id: number;
  ingredient_name: string;
  shopping_category: ShoppingCategory;
  amount: number | null;
  unit: string | null;
  raw_text: string | null;
}

export interface RecipeStep {
  id: number;
  position: number;
  text: string;
  timer_seconds: number | null;
}

export interface Dish extends DishListItem {
  description: string | null;
  base_servings: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  external_id: string | null;
  created_at: string;
  ingredients: DishIngredient[];
  steps: RecipeStep[];
}

export interface DishIngredientInput {
  ingredient_name: string;
  amount?: number | null;
  unit?: string | null;
  raw_text?: string | null;
}

export interface RecipeStepInput {
  text: string;
  timer_seconds?: number | null;
}

export interface DishInput {
  name: string;
  description?: string | null;
  cook_time_minutes?: number | null;
  base_servings: number;
  kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  tags: string[];
  ingredients: DishIngredientInput[];
  steps: RecipeStepInput[];
}

export interface DishFilters {
  q?: string;
  tags?: string[];
  max_time?: number;
  kcal_min?: number;
  kcal_max?: number;
  source?: DishSource;
}
