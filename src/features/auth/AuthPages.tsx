import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AuthError } from '@supabase/supabase-js';
import { ConfigNotice } from '../../components/ConfigNotice';
import { hasSupabaseConfig, isGoogleOAuthConfigured, supabase } from '../../lib/supabase';
import { normalizeEmail, validateEmail, validateName, validatePassword } from '../../lib/validation';
import { useAuth } from '../../app/AuthContext';

type FormState = 'idle' | 'busy' | 'success';

function readableAuthError(error: AuthError | Error | null): string {
  const message = error?.message.toLowerCase() ?? '';
  if (message.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (message.includes('email not confirmed')) return 'Confirme ton adresse email avant de te connecter.';
  if (message.includes('already registered') || message.includes('user already registered')) return 'Un compte utilise déjà cette adresse email.';
  if (message.includes('password should be at least')) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (message.includes('rate limit') || message.includes('too many requests')) return 'Trop de tentatives. Patiente un peu puis réessaie.';
  if (message.includes('network') || message.includes('fetch')) return 'Le service est momentanément injoignable. Vérifie ta connexion.';
  return 'La demande n’a pas abouti. Vérifie les paramètres Supabase et réessaie.';
}

function AuthFrame({ title, description, children, compact = false }: { title: string; description: string; children: ReactNode; compact?: boolean }) {
  return (
    <section className={`auth-page${compact ? ' auth-page-compact' : ''}`}>
      <div className="auth-aside">
        <div className="auth-aside-orb auth-aside-orb-one" />
        <div className="auth-aside-orb auth-aside-orb-two" />
        <div className="auth-aside-content">
          <span className="auth-aside-icon"><ShieldCheck size={25} /></span>
          <span className="eyebrow eyebrow-light">TON ESPACE EDUFLOW</span>
          <h2>Chaque notion comprise t’emmène plus loin.</h2>
          <p>Un espace d’apprentissage pensé pour avancer avec méthode, curiosité et confiance.</p>
          <div className="auth-aside-note"><CheckCircle2 size={17} /><span>Ton compte et ton profil restent privés.</span></div>
        </div>
        <span className="auth-aside-mark">EduFlow · Apprendre. Comprendre. Réussir.</span>
      </div>
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <Link to="/" className="auth-back-link"><ArrowLeft size={16} /> Retour à l’accueil</Link>
          <span className="auth-form-icon"><KeyRound size={21} /></span>
          <span className="eyebrow">BIENVENUE CHEZ EDUFLOW</span>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {!hasSupabaseConfig && <ConfigNotice compact />}
          {children}
          <p className="auth-legal-note">En continuant, tu reconnais avoir lu les <Link to="/terms">conditions d’utilisation</Link> et la <Link to="/privacy">notice de confidentialité</Link>, actuellement en brouillon de pré-lancement.</p>
        </div>
      </div>
    </section>
  );
}

function TextField({ label, type = 'text', value, onChange, autoComplete, error, required = true, placeholder }: {
  label: string; type?: string; value: string; onChange: (value: string) => void; autoComplete?: string; error?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function PasswordField({ value, onChange, error, label = 'Mot de passe', autoComplete = 'current-password' }: {
  value: string; onChange: (value: string) => void; error?: string; label?: string; autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="form-field">
      <span>{label}</span>
      <span className="password-control">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          minLength={8}
          aria-invalid={Boolean(error)}
        />
        <button type="button" className="password-toggle" onClick={() => setVisible((shown) => !shown)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return <div className={`form-message form-message-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{tone === 'success' ? <CheckCircle2 size={18} /> : <span className="message-dot" aria-hidden="true" />}<span>{children}</span></div>;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (emailError || passwordError) {
      setErrorMessage(emailError ?? passwordError ?? 'Vérifie les champs saisis.');
      return;
    }
    if (!supabase) return;
    setState('busy');
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (error) {
      setState('idle');
      setErrorMessage(readableAuthError(error));
      return;
    }
    navigate(from === '/onboarding' ? '/onboarding' : '/dashboard', { replace: true });
  };

  const continueWithGoogle = async () => {
    if (!supabase) return;
    setState('busy');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) {
      setState('idle');
      setErrorMessage(readableAuthError(error));
    }
  };

  return (
    <AuthFrame title="Ravi de te revoir." description="Connecte-toi pour retrouver ton espace d’apprentissage.">
      <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
        <TextField label="Adresse email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="toi@exemple.com" />
        <PasswordField value={password} onChange={setPassword} />
        <div className="form-meta-row"><span>Au moins 8 caractères</span><Link to="/forgot-password">Mot de passe oublié ?</Link></div>
        {errorMessage && <FormMessage tone="error">{errorMessage}</FormMessage>}
        <button className="button button-primary button-wide" type="submit" disabled={!hasSupabaseConfig || state === 'busy'}>
          {state === 'busy' ? 'Connexion…' : 'Se connecter'} <ArrowRight size={17} />
        </button>
      </form>
      {hasSupabaseConfig && isGoogleOAuthConfigured && <>
        <div className="auth-divider"><span>ou</span></div>
        <button className="button button-outline button-wide" type="button" onClick={() => void continueWithGoogle()} disabled={state === 'busy'}>
          <GoogleMark /> Continuer avec Google
        </button>
      </>}
      <p className="auth-switch">Tu n’as pas encore de compte ? <Link to="/register">Créer mon compte</Link></p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const formError = validateName(firstName, 'Prénom')
      ?? validateName(lastName, 'Nom')
      ?? validateEmail(email)
      ?? validatePassword(password);
    if (formError) {
      setErrorMessage(formError);
      return;
    }
    if (!accepted) {
      setErrorMessage('Confirme avoir pris connaissance des informations et documents de pré-lancement.');
      return;
    }
    if (!supabase) return;
    setState('busy');
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (error) {
      setState('idle');
      setErrorMessage(readableAuthError(error));
      return;
    }
    setState('success');
    if (data.session) {
      navigate('/onboarding', { replace: true });
      return;
    }
    setSuccessMessage('Compte créé. Consulte ta boîte de réception et confirme ton adresse email pour poursuivre.');
  };

  return (
    <AuthFrame title="Crée ton espace." description="Commence par ton compte; tu choisiras ton niveau et ta classe à l’étape suivante.">
      <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
        <div className="form-row-two">
          <TextField label="Prénom" value={firstName} onChange={setFirstName} autoComplete="given-name" placeholder="Ton prénom" />
          <TextField label="Nom" value={lastName} onChange={setLastName} autoComplete="family-name" placeholder="Ton nom" />
        </div>
        <TextField label="Adresse email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="toi@exemple.com" />
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" label="Créer un mot de passe" />
        <label className="check-field">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>J’ai pris connaissance des <Link to="/terms">conditions</Link> et de la <Link to="/privacy">notice de confidentialité</Link> en brouillon.</span>
        </label>
        {errorMessage && <FormMessage tone="error">{errorMessage}</FormMessage>}
        {successMessage && <FormMessage tone="success">{successMessage}</FormMessage>}
        <button className="button button-primary button-wide" type="submit" disabled={!hasSupabaseConfig || state === 'busy'}>
          {state === 'busy' ? 'Création du compte…' : 'Créer mon compte'} <ArrowRight size={17} />
        </button>
        <p className="form-small-note">L’inscription publique crée un compte étudiant. Les rôles privilégiés ne peuvent pas être choisis ici.</p>
      </form>
      <p className="auth-switch">Tu as déjà un compte ? <Link to="/login">Se connecter</Link></p>
    </AuthFrame>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(validateEmail(email) ?? null);
    if (validateEmail(email)) return;
    if (!supabase) return;
    setState('busy');
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setState('idle');
    if (error) {
      setErrorMessage(readableAuthError(error));
      return;
    }
    setMessage('Si un compte correspond à cette adresse, un lien de réinitialisation vient d’être envoyé.');
  };

  return (
    <AuthFrame title="Retrouvons l’accès." description="Indique l’adresse email liée à ton compte. Nous t’enverrons un lien pour choisir un nouveau mot de passe." compact>
      <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
        <TextField label="Adresse email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="toi@exemple.com" />
        {errorMessage && <FormMessage tone="error">{errorMessage}</FormMessage>}
        {message && <FormMessage tone="success">{message}</FormMessage>}
        <button className="button button-primary button-wide" type="submit" disabled={!hasSupabaseConfig || state === 'busy'}>
          {state === 'busy' ? 'Envoi…' : 'Envoyer le lien'} <Mail size={17} />
        </button>
      </form>
      <p className="auth-switch"><Link to="/login">Retour à la connexion</Link></p>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validLink, setValidLink] = useState<boolean | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) setValidLink(Boolean(data.session));
    }).catch(() => {
      if (active) setValidLink(false);
    });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }
    if (password !== confirmation) {
      setErrorMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (!supabase || !validLink) return;
    setState('busy');
    const { error } = await supabase.auth.updateUser({ password });
    setState('idle');
    if (error) {
      setErrorMessage(readableAuthError(error));
      return;
    }
    setSuccessMessage('Ton mot de passe a été modifié. Tu peux maintenant te connecter.');
  };

  return (
    <AuthFrame title="Choisis un nouveau mot de passe." description="Utilise au moins 8 caractères et ne le partage avec personne." compact>
      {hasSupabaseConfig && validLink === null && <div className="callback-loading" role="status"><span className="spinner" aria-hidden="true" />Vérification du lien de réinitialisation…</div>}
      {hasSupabaseConfig && validLink === false && <FormMessage tone="error">Le lien est manquant ou expiré. Demande une nouvelle réinitialisation.</FormMessage>}
      {validLink && <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
        <PasswordField value={password} onChange={setPassword} label="Nouveau mot de passe" autoComplete="new-password" />
        <PasswordField value={confirmation} onChange={setConfirmation} label="Confirmer le mot de passe" autoComplete="new-password" />
        {errorMessage && <FormMessage tone="error">{errorMessage}</FormMessage>}
        {successMessage && <FormMessage tone="success">{successMessage}</FormMessage>}
        <button className="button button-primary button-wide" type="submit" disabled={state === 'busy'}>
          {state === 'busy' ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'} <ArrowRight size={17} />
        </button>
      </form>}
      <p className="auth-switch"><Link to="/forgot-password">Demander un autre lien</Link></p>
    </AuthFrame>
  );
}

export function AuthCallbackPage() {
  const [callbackState, setCallbackState] = useState<'checking' | 'error' | 'invalid'>('checking');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const message = !hasSupabaseConfig
    ? 'La connexion Supabase doit être configurée avant de confirmer un compte.'
    : callbackState === 'error'
      ? 'Le lien ne peut pas être vérifié. Demande un nouveau lien ou réessaie.'
      : callbackState === 'invalid'
        ? 'Le lien est invalide ou expiré. Demande un nouveau lien de confirmation.'
        : 'Vérification du lien…';

  useEffect(() => {
    const client = supabase;
    if (!hasSupabaseConfig || !client) return;
    let active = true;
    const finish = async () => {
      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) {
        setCallbackState('error');
        return;
      }
      if (data.session || user) {
        const requested = new URLSearchParams(location.search).get('next');
        const safeTarget = requested === '/onboarding' ? '/onboarding' : '/dashboard';
        navigate(safeTarget, { replace: true });
      } else {
        setCallbackState('invalid');
      }
    };
    void finish();
    return () => { active = false; };
  }, [location.search, navigate, user]);

  return (
    <AuthFrame title="Presque prêt." description={message} compact>
      <div className="callback-loading"><span className="spinner" aria-hidden="true" /></div>
      <Link className="button button-outline button-wide" to="/login">Retour à la connexion <ArrowRight size={16} /></Link>
    </AuthFrame>
  );
}

function GoogleMark() {
  return <span className="google-mark" aria-hidden="true">G</span>;
}
