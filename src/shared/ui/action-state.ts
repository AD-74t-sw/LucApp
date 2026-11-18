/** State returned by every form Server Action and rendered by the form component. */
export type FieldErrors = Partial<Record<string, string>>;

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors: FieldErrors };

export const IDLE: ActionState = { status: "idle" };
