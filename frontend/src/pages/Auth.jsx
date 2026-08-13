import { useState, useEffect } from 'react'
import { authApi } from '../api/client'
import { TrendingUp, Send, Loader2 } from 'lucide-react'

export default function Auth({ onLoginSuccess }) {
  const [theme] = useState(() => localStorage.getItem('applyops-theme') || 'light')
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let data;
      if (isLogin) {
        data = await authApi.login(email, password)
      } else {
        data = await authApi.register(name, email, password)
      }
      
      onLoginSuccess()
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-screen bg-background text-foreground flex items-center justify-center p-4 selection:bg-primary/30">
      
      {/* Dynamic Background elements matching ops center theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px] z-10 animate-fade-in-up">
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-secondary border border-border shadow-sm shadow-primary/10 mb-4">
             <Send className="w-6 h-6 text-primary -ml-0.5 -mt-0.5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ApplyOps</h1>
          <p className="text-sm font-medium text-foreground-secondary">
            Command center for your job search
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-xl shadow-black/5 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-foreground mb-6">
            {isLogin ? 'Sign in to your account' : 'Create an account'}
          </h2>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Name
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-surface-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
                  placeholder="Aman Gupta"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                Email Address
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-surface-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
                placeholder="aman@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Password
                </label>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                className="w-full bg-surface-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary text-primary-foreground font-semibold text-sm rounded-xl py-3 flex items-center justify-center hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all active:scale-[0.98] shadow-sm disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-sm font-medium text-foreground-secondary hover:text-primary transition-colors focus:outline-none"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
