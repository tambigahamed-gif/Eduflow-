import { BookOpenCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

type BrandProps = { light?: boolean; compact?: boolean };

export function Brand({ light = false, compact = false }: BrandProps) {
  return (
    <Link className={`brand${light ? ' brand-light' : ''}${compact ? ' brand-compact' : ''}`} to="/" aria-label="EduFlow — accueil">
      <span className="brand-mark" aria-hidden="true"><BookOpenCheck size={24} strokeWidth={2.2} /></span>
      <span className="brand-copy">
        <strong>Edu<span>Flow</span></strong>
        {!compact && <small>Apprendre. Comprendre. Réussir.</small>}
      </span>
    </Link>
  );
}
