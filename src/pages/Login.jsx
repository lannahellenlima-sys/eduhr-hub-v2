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
      if (error) { setError('E-mail ou senha incorretos. Tente novamente.'); setLoading(false); return }
      if (data?.session) navigate(from, { replace: true })
    } catch { setError('Erro ao tentar entrar. Tente novamente.'); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #091D59 0%, #0D2570 60%, #1a3580 100%)', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo + Nome */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="/logo-unisulma.png"
            alt="Unisulma"
            style={{ width: 70, height: 70, objectFit: 'contain', marginBottom: 14 }}
          />
          <div style={{ fontSize: 30, fontWeight: 800, color: 'white', letterSpacing: '-1px', fontFamily: 'DM Sans, sans-serif' }}>
            Uni<span style={{ color: '#FFB640' }}>RH</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>
            Gestão de Pessoas · Unisulma
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 16, padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,.3)'
        }}>
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
                required autoFocus
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
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4
                }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <div className="alert alert-red" style={{ fontSize: 13 }}>{error}</div>}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 700,
                background: loading ? '#9CA3AF' : '#FFB640',
                color: '#091D59', border: 'none', borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4, fontFamily: 'DM Sans, sans-serif',
                transition: 'background .15s', letterSpacing: '.01em'
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 20 }}>
          Acesso restrito · LGPD — Lei nº 13.709/2018
        </p>
      </div>
    </div>
  )
}
