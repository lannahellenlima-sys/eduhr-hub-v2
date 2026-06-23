import { useState } from 'react'
import { X, Mail, CheckCircle } from 'lucide-react'

export default function ModalEmailNotificacao({ colaborador, documentosPendentes, onClose }) {
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Em produção: integrar com Supabase Edge Functions + Resend/SendGrid
  async function handleEnviar() {
    setEnviando(true)
    await new Promise(r => setTimeout(r, 1200))
    setEnviado(true)
    setEnviando(false)
  }

  const primeiroNome = colaborador?.nome?.split(' ')[0] || 'Colaborador'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Notificação por e-mail</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {enviado ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle size={48} color="var(--green)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)' }}>E-mail enviado!</p>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                Notificação enviada para <strong>{colaborador?.email}</strong>
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: 'var(--gray-500)', minWidth: 40 }}>Para:</span>
                <span style={{ color: 'var(--gray-900)', fontWeight: 500 }}>{colaborador?.email}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 13, marginBottom: 16 }}>
                <span style={{ color: 'var(--gray-500)', minWidth: 40 }}>Assunto:</span>
                <span style={{ color: 'var(--gray-900)' }}>EduHR Hub — Documentos pendentes no seu cadastro</span>
              </div>

              {/* Preview do e-mail */}
              <div style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: 'var(--blue)', padding: '20px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>EduHR Hub</p>
                  <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginTop: 2 }}>Gestão de Recursos Humanos</p>
                </div>
                <div style={{ padding: '20px 24px', background: 'white' }}>
                  <p style={{ fontSize: 14, color: 'var(--gray-900)', marginBottom: 10 }}>
                    Olá, <strong>{primeiroNome}</strong>,
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 12 }}>
                    Identificamos que os documentos abaixo ainda estão <strong>pendentes</strong> no seu cadastro funcional.
                    Pedimos que entregue ao setor de RH o mais breve possível para manter seu cadastro regularizado.
                  </p>

                  <div style={{ background: 'var(--gray-50)', borderRadius: 7, padding: '10px 14px', marginBottom: 12 }}>
                    {documentosPendentes.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Nenhum documento pendente.</p>
                    ) : (
                      documentosPendentes.map(doc => (
                        <div key={doc.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          fontSize: 13, color: 'var(--gray-800)', padding: '4px 0',
                          borderBottom: '1px solid var(--gray-200)'
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontWeight: 500 }}>{doc.tipo}</span>
                          {doc.descricao && <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>— {doc.descricao}</span>}
                        </div>
                      ))
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 10 }}>
                    Em caso de dúvidas, entre em contato com o RH pelo e-mail <strong>rh@unisulma.edu.br</strong>.
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--gray-700)' }}>
                    Atenciosamente,<br />
                    <strong>Setor de Recursos Humanos</strong>
                  </p>
                </div>
                <div style={{ background: 'var(--gray-50)', padding: '10px 24px', borderTop: '1px solid var(--gray-200)' }}>
                  <p style={{ fontSize: 11, color: 'var(--gray-400)', lineHeight: 1.5 }}>
                    Este é um e-mail automático enviado pelo sistema EduHR Hub. Suas informações são tratadas de forma
                    confidencial conforme a Lei nº 13.709/2018 (LGPD).
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>{enviado ? 'Fechar' : 'Cancelar'}</button>
          {!enviado && (
            <button className="btn btn-primary" onClick={handleEnviar} disabled={enviando || documentosPendentes.length === 0}>
              <Mail size={13} />
              {enviando ? 'Enviando...' : 'Enviar e-mail'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
