import type { ReactNode } from 'react';
import { AlertCircle, BookOpen, LoaderCircle } from 'lucide-react';

export function LearningPage({
  title,
  description,
  eyebrow = 'APPRENDRE',
  actions,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return <main className="learning-page">
    <header className="learning-header">
      <div className="learning-header-copy">
        <p className="learning-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="learning-reader-actions">{actions}</div>}
    </header>
    {children}
  </main>;
}

export function LearningLoading({ label = 'Chargement du contenu…' }: { label?: string }) {
  return <p className="phase2-loading" role="status"><LoaderCircle className="phase2-spin" size={18} />{label}</p>;
}

export function LearningError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="phase2-alert phase2-alert-error" role="alert"><AlertCircle size={18} /><span>{message}</span>{retry && <button className="phase2-button phase2-button-secondary" type="button" onClick={retry}>Réessayer</button>}</div>;
}

export function LearningEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <div className="learning-empty"><BookOpen size={24} aria-hidden="true" /><strong>{title}</strong><p>{description}</p></div>;
}

export function LearningStatus({ status }: { status: string }) {
  const label = status === 'published' ? 'Publié' : status === 'approved' ? 'Approuvé · à publier' : status === 'archived' ? 'Archivé' : status === 'in_review' ? 'En examen' : status === 'submitted' ? 'Soumis' : status === 'rejected' ? 'Refusé' : 'Brouillon';
  return <span className={`learning-status learning-status-${status}`}>{label}</span>;
}
