import React, { useState } from 'react';
import {
  LogIn, LogOut, UserPlus, Mail, Lock, User, ShieldCheck, Cloud,
  Heart, MonitorSmartphone, SlidersHorizontal, ExternalLink, Eye, EyeOff,
  Trash2, AlertTriangle, ArrowRight,
} from '../icons/motion';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'signin' | 'signup';

const DISCOVER_LINKS: Array<{ label: string; href: string; hint: string }> = [
  { label: 'Options', href: '/options', hint: 'Hors-ligne, idées, confidentialité' },
  { label: 'À propos', href: '/a-propos', hint: 'Version, FAQ et nouveautés' },
  { label: 'Comparer', href: '/comparer', hint: 'Plusieurs récitateurs côte à côte' },
  { label: 'Téléchargements', href: '/telechargements', hint: 'Sourates hors ligne' },
  { label: 'Sources & légal', href: '/sources', hint: 'Licences, confidentialité, conditions' },
];

type AccountPanelProps = {
  onNavigate?: (href: string) => void;
};

const DiscoverLinks: React.FC<{ onNavigate?: (href: string) => void }> = ({ onNavigate }) => (
  <section className="rounded-[1.5rem] border border-[#30455c]/50 bg-[#0f1928]/70 p-4">
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8ea1b3]">Pages</p>
    <p className="mt-1 text-sm font-bold text-[#f6f8fb]">Découvrir Sawra</p>
    <ul className="mt-3 flex flex-col gap-1.5">
      {DISCOVER_LINKS.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              if (!onNavigate) return;
              event.preventDefault();
              onNavigate(item.href);
            }}
            className="flex min-h-11 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition-colors hover:border-[#30455c]/70 hover:bg-[#162538]/70 tap-feedback"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-[#e6edf5]">{item.label}</span>
              <span className="mt-0.5 block text-[11px] text-[#95a7ba]">{item.hint}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#bfa078]/80" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  </section>
);

export const AccountPanel: React.FC<AccountPanelProps> = ({ onNavigate }) => {
  const {
    configured,
    loading,
    user,
    profile,
    authError,
    signIn,
    signUp,
    signOut,
    deleteOwnAccount,
    clearAuthError,
    updateDisplayName,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editName, setEditName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    setMode(next);
    setFormKey((k) => k + 1);
    clearAuthError();
    setInfo(null);
  };

  if (!configured) {
    return (
      <div className="rounded-3xl border border-[#bfa078]/20 bg-[#e2d0ba]/6 p-5">
        <h3 className="font-bold text-[#f6f8fb]">Compte cloud indisponible</h3>
        <p className="mt-2 text-sm text-[#b4c0ce]">
          Ajoutez <code className="text-[#e6d5c2]">NEXT_PUBLIC_SUPABASE_URL</code> et{' '}
          <code className="text-[#e6d5c2]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans{' '}
          <code className="text-[#d0d9e3]">.env.local</code> puis relancez le serveur.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="shimmer-loader h-48 rounded-3xl border border-slate-900" />;
  }

  if (user) {
    const shownName = profile?.display_name || 'Compte Sawra';
    const initial = shownName.trim().charAt(0).toUpperCase() || 'Q';

    const startEditName = () => {
      setEditName(profile?.display_name || '');
      setEditingName(true);
      setInfo(null);
      clearAuthError();
    };

    const cancelEditName = () => {
      setEditingName(false);
      setEditName('');
      setInfo(null);
    };

    const saveDisplayName = async () => {
      setBusy(true);
      setInfo(null);
      clearAuthError();
      const result = await updateDisplayName(editName);
      setBusy(false);
      if (!result.ok) {
        setInfo(result.message || 'Impossible d’enregistrer.');
        return;
      }
      setEditingName(false);
      setInfo('Pseudo mis à jour.');
    };

    return (
      <div className="flex flex-col gap-4 pb-2">
        <section className="auth-card relative overflow-hidden rounded-[1.75rem] border border-[#30455c]/50 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.65)]">
          <div
            className="absolute inset-0 bg-[linear-gradient(155deg,#0f1a28_0%,#162538_48%,#0a121c_100%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(241,232,220,0.22),transparent_68%)]"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e2d0ba]/45 to-transparent"
            aria-hidden
          />

          <div className="relative z-10 p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-[#e2d0ba] to-[#bfa078] text-xl font-black text-[#0c1522] shadow-[0_10px_28px_rgba(191,160,120,0.35)]">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Connecté
                </p>
                {!editingName ? (
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-xl font-black tracking-tight text-[#f6f8fb]">
                      {shownName}
                    </h3>
                    <button
                      type="button"
                      onClick={startEditName}
                      className="shrink-0 rounded-lg border border-[#46607b]/50 bg-[#162538]/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e2d0ba] hover:border-[#bfa078]/40 tap-feedback"
                    >
                      Modifier
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    <label className="sr-only" htmlFor="account-display-name">
                      Pseudo
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f93a8]" />
                      <input
                        id="account-display-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={40}
                        autoFocus
                        placeholder="Votre pseudo"
                        className="w-full rounded-xl border border-[#30455c]/55 bg-[#0c1522]/70 py-2.5 pl-10 pr-3 text-sm text-[#f6f8fb] placeholder:text-[#6f8499] focus:border-[#bfa078]/50 focus:outline-none focus:ring-2 focus:ring-[#bfa078]/20"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void saveDisplayName()}
                        className="brand-button-primary rounded-xl px-3 py-2 text-[11px] font-bold disabled:opacity-60 tap-feedback"
                      >
                        {busy ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={cancelEditName}
                        className="rounded-xl border border-[#46607b]/50 bg-[#162538]/70 px-3 py-2 text-[11px] font-bold text-[#d0d9e3] tap-feedback"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
                <p className="mt-0.5 truncate text-sm text-[#95a7ba]">{user.email}</p>
              </div>
            </div>

            {(authError || info) && (
              <p
                className={`mt-4 rounded-2xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                  authError
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    : 'border-[#bfa078]/30 bg-[#e2d0ba]/10 text-[#e6d5c2]'
                }`}
              >
                {authError || info}
              </p>
            )}

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                { icon: Heart, label: 'Favoris synchronisés' },
                { icon: MonitorSmartphone, label: 'Multi-appareils' },
                { icon: SlidersHorizontal, label: 'Préférences cloud' },
                { icon: Cloud, label: 'Reprise automatique' },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-2xl border border-[#30455c]/45 bg-[#0c1522]/55 px-3.5 py-3 text-[12px] font-medium text-[#d0d9e3]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e2d0ba]/12 text-[#e6d5c2]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            <a
              href="https://gomuslimlife.com"
              target="_blank"
              rel="noopener noreferrer"
              className="brand-button-secondary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold transition-all"
            >
              Compte partagé — ouvrir le site associé
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>

            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/15 tap-feedback"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-rose-400/20 bg-[#140d12]/80 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-500/10 text-rose-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-black text-[#f6f8fb]">Supprimer mon compte</h4>
              <p className="mt-1 text-[12px] leading-relaxed text-[#95a7ba]">
                Droit d’effacement : toutes vos données Sawra (favoris, signets, historique, reprise)
                et ce compte sont supprimés définitivement. Le compte associé{' '}
                <span className="font-semibold text-[#d0d9e3]">GoMuslimLife</span> est aussi fermé.
              </p>
            </div>
          </div>

          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(true);
                setDeleteConfirmText('');
                setInfo(null);
                clearAuthError();
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-500/16 tap-feedback"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer toutes mes données et mon compte
            </button>
          ) : (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-rose-400/25 bg-[#0c1522]/55 p-3.5 sm:p-4">
              <p className="text-[12px] leading-relaxed text-[#c8d1db]">
                Cette action est <span className="font-bold text-rose-200">définitive</span>. Vos
                favoris, signets, historique, reprise et préférences Sawra seront effacés, et le
                compte GoMuslimLife associé sera fermé.
              </p>
              <p className="text-[12px] leading-relaxed text-[#95a7ba]">
                Pour confirmer, tapez{' '}
                <span className="rounded-md border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[12px] font-bold text-rose-100">
                  supprimer
                </span>{' '}
                dans le champ ci-dessous, puis validez.
              </p>
              <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#8ea1b3]" htmlFor="account-delete-confirm">
                Confirmation
              </label>
              <input
                id="account-delete-confirm"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='Écrivez « supprimer »'
                className="w-full rounded-xl border border-rose-400/25 bg-[#0c1522]/80 py-2.5 px-3 text-sm text-[#f6f8fb] placeholder:text-[#6f8499] focus:border-rose-400/50 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
              />
              {info && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
                  {info}
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={busy || deleteConfirmText.trim().toLowerCase() !== 'supprimer'}
                  onClick={() => {
                    void (async () => {
                      setBusy(true);
                      setInfo(null);
                      clearAuthError();
                      const result = await deleteOwnAccount();
                      setBusy(false);
                      if (!result.ok) {
                        setInfo(result.message || 'Suppression impossible.');
                      }
                    })();
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 text-[12px] font-bold text-white disabled:opacity-45 tap-feedback"
                >
                  <Trash2 className="h-4 w-4" />
                  {busy ? 'Suppression…' : 'Valider la suppression'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteConfirmText('');
                    setInfo(null);
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[#46607b]/50 bg-[#162538]/70 px-4 text-[12px] font-bold text-[#d0d9e3] tap-feedback"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>

        <DiscoverLinks onNavigate={onNavigate} />
      </div>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setInfo(null);
    clearAuthError();

    if (mode === 'signin') {
      const result = await signIn(email.trim(), password);
      setBusy(false);
      if (result.message) setInfo(result.message);
      return;
    }

    const result = await signUp(email.trim(), password, displayName.trim());
    setBusy(false);

    if (!result.ok && /existe déjà|already registered/i.test(result.message || '')) {
      switchMode('signin');
      setInfo('Ce compte existe déjà. Utilisez « Se connecter ».');
      return;
    }

    if (result.message) setInfo(result.message);
  };

  const isSignIn = mode === 'signin';

  return (
    <div className="flex flex-col gap-4 pb-2">
    <div className="auth-card relative overflow-hidden rounded-[1.75rem] border border-[#30455c]/50 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.65)]">
      <div
        className="absolute inset-0 bg-[linear-gradient(155deg,#0f1a28_0%,#162538_48%,#0a121c_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(121,144,161,0.18),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(241,232,220,0.16),transparent_68%)]"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e2d0ba]/45 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 p-5 sm:p-7">
        <div className="mb-6 flex items-start gap-3.5">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-[400ms] ${
              isSignIn
                ? 'border-[#bfa078]/35 bg-[#e2d0ba]/14 text-[#e6d5c2]'
                : 'border-[#46607b]/50 bg-[#20334a]/80 text-[#d0d9e3]'
            }`}
          >
            {isSignIn ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8ea1b3]">
              Sawra
            </p>
            <div key={`title-${mode}`} className="auth-mode-fade">
              <h3 className="mt-1 text-xl font-black tracking-tight text-[#f6f8fb] sm:text-2xl">
                {isSignIn ? 'Bon retour' : 'Créer un compte'}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#95a7ba] sm:text-[13px]">
                {isSignIn
                  ? 'Connectez-vous pour synchroniser vos favoris, signets, historique, reprise et préférences sur Sawra.'
                  : 'Créez votre compte Sawra en quelques secondes pour retrouver votre écoute sur tous vos appareils.'}
              </p>
            </div>
          </div>
        </div>

        <div
          className="relative mb-5 grid grid-cols-2 rounded-2xl border border-[#30455c]/50 bg-[#07111d]/55 p-1"
          role="tablist"
          aria-label="Mode d’authentification"
        >
          <span
            className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl bg-[#e2d0ba] shadow-[0_6px_18px_rgba(191,160,120,0.28)] transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isSignIn ? 'translate-x-0' : 'translate-x-[calc(100%+4px)]'
            }`}
            aria-hidden
          />
          <button
            type="button"
            role="tab"
            aria-selected={isSignIn}
            onClick={() => switchMode('signin')}
            className={`relative z-10 rounded-xl px-3 py-2.5 text-[12px] font-bold transition-colors duration-300 ${
              isSignIn ? 'text-[#0c1522]' : 'text-[#95a7ba] hover:text-[#e6edf5]'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isSignIn}
            onClick={() => switchMode('signup')}
            className={`relative z-10 rounded-xl px-3 py-2.5 text-[12px] font-bold transition-colors duration-300 ${
              !isSignIn ? 'text-[#0c1522]' : 'text-[#95a7ba] hover:text-[#e6edf5]'
            }`}
          >
            S&apos;inscrire
          </button>
        </div>

        <form key={formKey} onSubmit={onSubmit} className="auth-mode-fade flex flex-col gap-3.5">
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isSignIn ? 'grid-rows-[0fr] opacity-0 -mb-3.5' : 'grid-rows-[1fr] opacity-100 mb-0'
            }`}
          >
            <div className="overflow-hidden">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8ea1b3]">
                  Pseudo
                </span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f93a8]" />
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex. Sofiane"
                    tabIndex={isSignIn ? -1 : 0}
                    className="w-full rounded-2xl border border-[#30455c]/55 bg-[#0c1522]/70 py-3 pl-11 pr-3.5 text-sm text-[#f6f8fb] placeholder:text-[#6f8499] transition-colors focus:border-[#bfa078]/50 focus:outline-none focus:ring-2 focus:ring-[#bfa078]/20"
                  />
                </div>
              </label>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8ea1b3]">
              E-mail
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f93a8]" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@email.com"
                className="w-full rounded-2xl border border-[#30455c]/55 bg-[#0c1522]/70 py-3 pl-11 pr-3.5 text-sm text-[#f6f8fb] placeholder:text-[#6f8499] transition-colors focus:border-[#bfa078]/50 focus:outline-none focus:ring-2 focus:ring-[#bfa078]/20"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8ea1b3]">
              Mot de passe
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f93a8]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                className="w-full rounded-2xl border border-[#30455c]/55 bg-[#0c1522]/70 py-3 pl-11 pr-12 text-sm text-[#f6f8fb] placeholder:text-[#6f8499] transition-colors focus:border-[#bfa078]/50 focus:outline-none focus:ring-2 focus:ring-[#bfa078]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#7f93a8] transition-colors hover:bg-[#162538] hover:text-[#e6edf5] tap-feedback"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {(authError || info) && (
            <p
              className={`rounded-2xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                authError
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-[#bfa078]/30 bg-[#e2d0ba]/10 text-[#e6d5c2]'
              }`}
            >
              {authError || info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="brand-button-primary mt-1 min-h-12 rounded-2xl px-4 py-3 text-sm font-black disabled:opacity-60 tap-feedback"
          >
            {busy ? 'Patientez…' : isSignIn ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[#7f93a8]">
          {isSignIn ? (
            <>
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-bold text-[#e6d5c2] underline-offset-2 hover:underline"
              >
                S&apos;inscrire
              </button>
            </>
          ) : (
            <>
              Déjà inscrit ?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="font-bold text-[#e6d5c2] underline-offset-2 hover:underline"
              >
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </div>

      <DiscoverLinks onNavigate={onNavigate} />
    </div>
  );
};
