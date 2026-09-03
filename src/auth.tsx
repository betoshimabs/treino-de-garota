import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { FirebaseError } from 'firebase/app'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { ArrowLeft, Check, Eye, EyeOff, LogIn, Mail, RotateCcw } from 'lucide-react'
import { auth, authPersistenceReady } from './firebase'
import {
  deleteDatabaseForUser,
  importLegacyDataForCurrentUser,
  keepLegacyDataSeparate,
  shouldOfferLegacyDataImport,
  useDatabaseForUser,
} from './db'

const BRAND_ICON_URL = `${import.meta.env.BASE_URL}brabita-icon-192.png`

type AuthContextValue = {
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  createAccount: (name: string, email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendVerification: () => Promise<void>
  refreshAccount: () => Promise<void>
  signOutAccount: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountRevision, setAccountRevision] = useState(0)

  useEffect(() => {
    let unsubscribe: () => void = () => undefined
    let active = true
    void authPersistenceReady.then(() => {
      if (!active) return
      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser)
        setLoading(false)
      }, () => setLoading(false))
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signInWithEmail(email, password) {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    },
    async createAccount(name, email, password) {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() })
      await sendEmailVerification(credential.user)
      setAccountRevision((value) => value + 1)
    },
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(auth, email.trim())
    },
    async resendVerification() {
      if (!auth.currentUser) return
      await sendEmailVerification(auth.currentUser)
    },
    async refreshAccount() {
      if (!auth.currentUser) return
      await reload(auth.currentUser)
      setUser(auth.currentUser)
      setAccountRevision((value) => value + 1)
    },
    async signOutAccount() {
      await signOut(auth)
    },
    async deleteAccount() {
      const currentUser = auth.currentUser
      if (!currentUser) return
      const userId = currentUser.uid
      await deleteUser(currentUser)
      await deleteDatabaseForUser(userId)
    },
  }), [accountRevision, loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth()
  if (loading) return <AuthLoading text="Confirmando sua conta…" />
  if (!user) return <AuthScreen />
  if (!user.emailVerified && user.providerData.some((provider) => provider.providerId === 'password')) {
    return <VerifyEmailScreen email={user.email ?? ''} />
  }
  return <UserDataBoundary userId={user.uid}>{children}</UserDataBoundary>
}

function UserDataBoundary({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'legacy' | 'ready' | 'error'>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    useDatabaseForUser(userId)
    void shouldOfferLegacyDataImport()
      .then((hasLegacyData) => { if (active) setState(hasLegacyData ? 'legacy' : 'ready') })
      .catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [userId])

  if (state === 'loading') return <AuthLoading text="Abrindo seu diário…" />
  if (state === 'error') return <AuthMessage title="Não conseguimos abrir seu diário." text="Tente recarregar o aplicativo. Seus dados locais não foram apagados." />
  if (state === 'legacy') {
    return <main className="auth-shell"><section className="auth-card migration-card">
      <BrandSignature />
      <p className="eyebrow">um cuidado antes de entrar</p>
      <h1>Encontramos seu diário deste aparelho.</h1>
      <p>Você pode vinculá-lo a esta conta. A cópia anterior será preservada como segurança.</p>
      <button className="primary-button wide" disabled={busy} onClick={async () => {
        setBusy(true)
        try {
          await importLegacyDataForCurrentUser()
          setState('ready')
        } catch {
          setState('error')
        } finally {
          setBusy(false)
        }
      }}>{busy ? 'trazendo seus dados…' : 'trazer meu diário'}</button>
      <button className="auth-text-button" disabled={busy} onClick={() => { keepLegacyDataSeparate(); setState('ready') }}>começar vazio nesta conta</button>
    </section></main>
  }
  return children
}

function AuthScreen() {
  const { createAccount, resetPassword, signInWithEmail, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (mode === 'signup' && password !== confirmPassword) {
      setError('As senhas não são iguais.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') await signInWithEmail(email, password)
      if (mode === 'signup') await createAccount(name, email, password)
      if (mode === 'reset') {
        await resetPassword(email)
        setMessage('Enviamos o link para redefinir sua senha.')
      }
    } catch (caught) {
      setError(getAuthErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const changeMode = (nextMode: typeof mode) => {
    setMode(nextMode)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  return <main className="auth-shell"><section className="auth-card">
    <BrandSignature />
    {mode === 'reset' ? <button className="auth-back" onClick={() => changeMode('signin')}><ArrowLeft size={18} /> voltar</button> : <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
      <button role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'selected' : ''} onClick={() => changeMode('signin')}>entrar</button>
      <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'selected' : ''} onClick={() => changeMode('signup')}>criar conta</button>
    </div>}
    <div className="auth-heading">
      <p className="eyebrow">{mode === 'signin' ? 'bom te ver por aqui' : mode === 'signup' ? 'seu diário começa aqui' : 'recuperar acesso'}</p>
      <h1>{mode === 'signin' ? 'Entre na Brabita.' : mode === 'signup' ? 'Crie sua conta.' : 'Esqueceu a senha?'}</h1>
      <p>{mode === 'reset' ? 'Digite seu e-mail e enviaremos um link de redefinição.' : 'Seus registros ficam neste aparelho, separados pela sua conta.'}</p>
    </div>
    {mode !== 'reset' && <button className="google-button" disabled={busy} onClick={async () => {
      setError('')
      setBusy(true)
      try { await signInWithGoogle() } catch (caught) { setError(getAuthErrorMessage(caught)) } finally { setBusy(false) }
    }}><GoogleMark /> continuar com Google</button>}
    {mode !== 'reset' && <div className="auth-divider"><span>ou use seu e-mail</span></div>}
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      {mode === 'signup' && <label><span>como quer ser chamada?</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="seu nome ou apelido" required /></label>}
      <label><span>e-mail</span><input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" required /></label>
      {mode !== 'reset' && <label><span>senha</span><span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'pelo menos 6 caracteres' : 'sua senha'} required /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>}
      {mode === 'signup' && <label><span>repita a senha</span><input type="password" autoComplete="new-password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>}
      {error && <p className="auth-feedback error" role="alert">{error}</p>}
      {message && <p className="auth-feedback success" role="status"><Check size={17} /> {message}</p>}
      <button className="primary-button wide" disabled={busy}>{busy ? 'só um instante…' : mode === 'signin' ? <><LogIn size={18} /> entrar</> : mode === 'signup' ? 'criar minha conta' : <><Mail size={18} /> enviar link</>}</button>
    </form>
    {mode === 'signin' && <button className="auth-text-button" onClick={() => changeMode('reset')}>esqueci minha senha</button>}
    <details className="origin-migration-note">
      <summary>já usava a versão de teste?</summary>
      <p>Os navegadores não levam dados automaticamente de um domínio para outro. Abra a versão anterior, baixe o backup em <strong>Eu → Seus dados</strong> e restaure aqui depois de entrar.</p>
      <a href="https://betoshimabs.github.io/treino-de-garota/#/eu" target="_blank" rel="noreferrer">abrir versão anterior</a>
    </details>
  </section></main>
}

function VerifyEmailScreen({ email }: { email: string }) {
  const { refreshAccount, resendVerification, signOutAccount } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  return <main className="auth-shell"><section className="auth-card verification-card">
    <BrandSignature />
    <span className="mail-orbit"><Mail /></span>
    <p className="eyebrow">confirme que é você</p>
    <h1>Olhe seu e-mail.</h1>
    <p>Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, volte aqui.</p>
    {error && <p className="auth-feedback error" role="alert">{error}</p>}
    {message && <p className="auth-feedback success" role="status">{message}</p>}
    <button className="primary-button wide" disabled={busy} onClick={async () => {
      setBusy(true); setError('')
      try {
        await refreshAccount()
        if (!auth.currentUser?.emailVerified) setError('A confirmação ainda não apareceu. Abra o link recebido e tente novamente.')
      } catch (caught) { setError(getAuthErrorMessage(caught)) } finally { setBusy(false) }
    }}><RotateCcw size={18} /> já confirmei</button>
    <button className="auth-text-button" disabled={busy} onClick={async () => {
      setBusy(true); setError('')
      try { await resendVerification(); setMessage('Enviamos um novo e-mail de confirmação.') } catch (caught) { setError(getAuthErrorMessage(caught)) } finally { setBusy(false) }
    }}>enviar novamente</button>
    <button className="auth-text-button muted" disabled={busy} onClick={() => void signOutAccount()}>usar outra conta</button>
  </section></main>
}

function AuthLoading({ text }: { text: string }) {
  return <main className="auth-loading"><img src={BRAND_ICON_URL} alt="" /><strong>Brabita</strong><span className="auth-spinner" /><p>{text}</p></main>
}

function AuthMessage({ title, text }: { title: string; text: string }) {
  return <main className="auth-shell"><section className="auth-card verification-card"><BrandSignature /><h1>{title}</h1><p>{text}</p><button className="primary-button" onClick={() => window.location.reload()}>tentar novamente</button></section></main>
}

function BrandSignature() {
  return <div className="auth-brand"><img src={BRAND_ICON_URL} alt="" /><strong>Brabita</strong></div>
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.09-1.93 3.27-4.77 3.27-8.1Z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.29-2.65l-3.57-2.77c-.98.66-2.24 1.06-3.72 1.06-2.87 0-5.3-1.94-6.17-4.54H2.14v2.85A11 11 0 0 0 12 23Z"/><path fill="#fbbc05" d="M5.83 14.1A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.43.35-2.1V7.05H2.14A11 11 0 0 0 1 12c0 1.78.43 3.46 1.14 4.95l3.69-2.85Z"/><path fill="#ea4335" d="M12 5.36c1.62 0 3.06.56 4.2 1.64l3.17-3.17A10.63 10.63 0 0 0 12 1a11 11 0 0 0-9.86 6.05L5.83 9.9c.87-2.6 3.3-4.54 6.17-4.54Z"/></svg>
}

export function getAuthErrorMessage(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : ''
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Este e-mail já está ligado a uma conta.',
    'auth/invalid-email': 'Confira o endereço de e-mail.',
    'auth/invalid-credential': 'E-mail ou senha não conferem.',
    'auth/user-disabled': 'Esta conta está desativada.',
    'auth/weak-password': 'Escolha uma senha com pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Foram feitas muitas tentativas. Espere um pouco e tente novamente.',
    'auth/network-request-failed': 'Não conseguimos acessar a internet. Sua sessão salva continua disponível offline.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.',
    'auth/unauthorized-domain': 'Este endereço ainda não foi autorizado no Firebase.',
    'auth/requires-recent-login': 'Por segurança, saia, entre novamente e repita esta ação.',
  }
  return messages[code] ?? 'Não conseguimos concluir agora. Tente novamente.'
}
