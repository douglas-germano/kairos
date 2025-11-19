import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuth from '../contexts/useAuth'
import Button from '../components/Button'
import Input from '../components/Input'
import { tenantsAPI } from '../services/api'

export default function Register() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!orgName.trim()) {
      setError('Nome da organização é obrigatório')
      setLoading(false)
      return
    }

    const result = await register(email, nome, password)
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    try {
      await tenantsAPI.create({ nome: orgName.trim() })
      navigate('/chat')
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao criar organização'
      setError(msg)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light dark:bg-neutral-dark px-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="text-center mb-8">
          <h1 className="text-h1 mb-2">KAIROS</h1>
          <p className="text-body text-neutral-text-secondary">Criar nova conta</p>
        </div>

        <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              required
            />

            <Input
              label="Nome da Organização"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex: Minha Agência"
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />

            {error && (
              <div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-caption text-neutral-text-secondary">
              Já tem uma conta?{' '}
              <Link 
                to="/login" 
                className="text-primary hover:text-primary-dark font-semibold"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

