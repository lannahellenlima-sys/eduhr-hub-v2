import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('E-mail ou senha incorretos. Tente novamente.')
        setLoading(false)
        return
      }
      if (data?.session) {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError('Erro ao tentar entrar. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff8ee 0%, #fff3e0 100%)', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logo-unisulma.png"
            alt="Unisulma"
            style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
            Uni<span style={{ color: '#F59E0B' }}>RH</span>
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Gestão de Pessoas · Unisulma
          </p>
        </div>

        <div className="card" style={{ padding: 32, borderRadius: 16, boxShadow: '0 4px 24px rgba(245,158,11,.12)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 20 }}>
            Entrar na plataforma
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                className="form-input"
                type="email"
                placeholder="seu@unisulma.edu.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4
                  }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-red" style={{ fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 600,
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                marginTop: 4, fontFamily: 'var(--font)',
                opacity: loading ? .7 : 1, transition: 'opacity .15s'
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 20 }}>
          Acesso restrito · LGPD — Lei nº 13.709/2018
        </p>
      </div>
    </div>
  )
}
