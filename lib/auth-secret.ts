import 'server-only';

type GetAuthSecretOptions = {
  required?: boolean;
};

const MISSING_AUTH_SECRET_ERROR = 'AUTH_SECRET_NOT_CONFIGURED';

function normalizeSecret(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  return normalized;
}

export function getAuthSecret(options: { required: true }): string;
export function getAuthSecret(options?: GetAuthSecretOptions): string | null;
export function getAuthSecret(options: GetAuthSecretOptions = {}): string | null {
  const secret =
    normalizeSecret(process.env.AUTH_SECRET) ??
    normalizeSecret(process.env.NEXTAUTH_SECRET) ??
    normalizeSecret(process.env.SESSION_SECRET);

  if (!secret && options.required) {
    throw new Error(MISSING_AUTH_SECRET_ERROR);
  }

  return secret;
}

export function isMissingAuthSecretError(error: unknown): boolean {
  return error instanceof Error && error.message === MISSING_AUTH_SECRET_ERROR;
}
