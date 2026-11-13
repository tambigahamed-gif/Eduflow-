import { AlertCircle, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type ConfigNoticeProps = { fullPage?: boolean; compact?: boolean };

export function ConfigNotice({ fullPage = false, compact = false }: ConfigNoticeProps) {
  const content = (
    <div className={`config-notice${compact ? ' config-notice-compact' : ''}`} role="status">
      <span className="notice-icon"><AlertCircle size={20} /></span>
      <div>
        <strong>Connexion Supabase à configurer</strong>
        <p>Ajoute <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> dans les paramètres d’environnement WebDev ou Vercel, puis redémarre l’application. Les formulaires d’authentification ne contactent pas encore de service.</p>
        {!compact && <Link to="/privacy">Consulter les informations de confidentialité <Settings2 size={15} /></Link>}
      </div>
    </div>
  );

  if (!fullPage) return content;
  return (
    <main className="full-state config-full-state">
      <div className="state-card config-state-card">
        <span className="state-icon"><Settings2 size={24} /></span>
        <span className="eyebrow">Configuration requise</span>
        <h1>Connectons ton espace d’apprentissage.</h1>
        <p>La base Supabase n’est pas encore reliée. Une fois les paramètres du projet ajoutés et la migration appliquée, l’inscription et la connexion seront disponibles.</p>
        {content}
      </div>
    </main>
  );
}
