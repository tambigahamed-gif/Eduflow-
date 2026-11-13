export type AuthValidationErrors = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Saisis ton adresse email.';
  if (!emailPattern.test(value)) return 'Vérifie le format de ton adresse email.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Saisis un mot de passe.';
  if (password.length < 8) return 'Choisis au moins 8 caractères.';
  return undefined;
}

export function validateName(value: string, label: string): string | undefined {
  const name = value.trim();
  if (!name) return `Saisis ton ${label.toLowerCase()}.`;
  if (name.length > 80) return `${label} doit contenir 80 caractères maximum.`;
  return undefined;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
