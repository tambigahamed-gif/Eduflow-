import { describe, expect, it } from 'vitest';
import { normalizeEmail, validateEmail, validateName, validatePassword } from './validation';

describe('validation des formulaires', () => {
  it('refuse un email vide ou mal formé et normalise le format valide', () => {
    expect(validateEmail('')).toBeTruthy();
    expect(validateEmail('invalide')).toBeTruthy();
    expect(validateEmail('eleve@example.com')).toBeUndefined();
    expect(normalizeEmail('  Eleve@Example.COM ')).toBe('eleve@example.com');
  });

  it('exige un mot de passe de huit caractères minimum', () => {
    expect(validatePassword('court')).toBeTruthy();
    expect(validatePassword('longpass8')).toBeUndefined();
  });

  it('exige les noms et borne leur longueur', () => {
    expect(validateName(' ', 'Prénom')).toBeTruthy();
    expect(validateName('Awa', 'Prénom')).toBeUndefined();
    expect(validateName('a'.repeat(81), 'Nom')).toContain('80');
  });
});
