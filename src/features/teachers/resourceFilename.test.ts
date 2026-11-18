import { describe, expect, it } from 'vitest';
import { sanitizeResourceFilename } from './resourceFilename';

describe('sanitizeResourceFilename', () => {
  it('normalise les accents et remplace les espaces/caractères spéciaux', () => {
    expect(sanitizeResourceFilename("../Cours d'Algèbre.pdf")).toBe('Cours_d_Algebre.pdf');
  });

  it('retire les préfixes qui pourraient commencer par un point, tiret ou souligné', () => {
    expect(sanitizeResourceFilename('.._--fiche.pdf')).toBe('fiche.pdf');
  });

  it('fournit un nom de repli et préserve l’extension des noms longs', () => {
    expect(sanitizeResourceFilename('...---___')).toBe('resource');
    const longName = sanitizeResourceFilename(`${'a'.repeat(200)}.PDF`);
    expect(longName).toHaveLength(150);
    expect(longName.endsWith('.pdf')).toBe(true);
  });
});
