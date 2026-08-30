export type ActionFormState = {
  error?: string;
};

export function actionError(error: unknown): ActionFormState {
  return {
    error: error instanceof Error ? error.message : "Something went wrong.",
  };
}
