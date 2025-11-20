import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'
import Button from '../components/Button'
import Input from '../components/Input'

export default function ResetPassword() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const location = useLocation()
    const { email, code } = location.state || {}

    useEffect(() => {
        if (!email || !code) {
            navigate('/forgot-password')
        }
    }, [email, code, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('As senhas não coincidem')
            return
        }

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres')
            return
        }

        setLoading(true)

        try {
            await authAPI.resetPassword({ email, code, new_password: password })
            navigate('/login', { state: { message: 'Senha redefinida com sucesso! Faça login.' } })
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao redefinir senha.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-light dark:bg-neutral-dark p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="text-h2 font-bold text-neutral-text dark:text-neutral-text-dark">Nova Senha</h2>
                    <p className="mt-2 text-body text-neutral-text-secondary">
                        Crie uma nova senha para sua conta.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            label="Nova Senha"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••"
                        />
                        <Input
                            label="Confirmar Nova Senha"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-small text-center">{error}</div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Salvando...' : 'Redefinir Senha'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
