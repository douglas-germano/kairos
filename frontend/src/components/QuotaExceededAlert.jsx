import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

export default function QuotaExceededAlert({ error }) {
    const navigate = useNavigate()

    if (!error || error.code !== 'QUOTA_EXCEEDED') return null

    const title = error.details?.title || 'Limite de quota excedido'
    const message = error.error || 'Você atingiu um limite do seu plano.'
    const upgradeUrl = error.details?.upgrade_url || '/plans'

    return (
        <div className="w-full max-w-2xl mx-auto mt-6">
            <div className="rounded-xl border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20 p-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-orange-500 dark:bg-orange-400 flex items-center justify-center">
                            <AlertTriangle size={24} className="text-white dark:text-neutral-dark" />
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-h3 text-orange-900 dark:text-orange-100 mb-2">
                            {title}
                        </h3>
                        <p className="text-body text-orange-800 dark:text-orange-200 mb-4">
                            {message}
                        </p>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => navigate(upgradeUrl)}
                                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
                            >
                                Ver Planos
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => window.location.reload()}
                            >
                                Tentar Novamente
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
