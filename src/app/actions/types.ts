export type FormState = {
  error?: string;
  message?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  needsConfirmation?: boolean;
  code?: string;
};
