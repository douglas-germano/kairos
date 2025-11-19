import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import Button from '../components/Button'

export default function Plans() {
  const navigate = useNavigate()
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 'R$ 0/mês',
      description: 'Para começar sem custos.',
      features: [
        '100 chamadas/dia',
        'Até 10 conversas',
        '2 agentes customizados',
        '5 projetos',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'R$ 49/mês',
      description: 'Para uso profissional e equipes pequenas.',
      features: [
        '10.000 chamadas/dia',
        'Até 1.000 conversas',
        '50 agentes customizados',
        '100 projetos',
        'Prioridade no suporte',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'R$ 499/mês',
      description: 'Para empresas com alto volume.',
      features: [
        'Limites sob demanda',
        'SLA dedicado',
        'Integrações avançadas',
        'Onboarding assistido',
      ],
    },
  ]

  const onSelect = () => {
    navigate('/profile')
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Planos" subtitle="Escolha o plano ideal para você" />
      <div className="flex-1 p-xl">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.id} className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-xl p-6 flex flex-col">
              <div className="flex items-baseline justify-between">
                <h3 className="text-h3">{p.name}</h3>
                <span className="text-h3 text-primary">{p.price}</span>
              </div>
              <p className="text-body text-neutral-text-secondary mt-2">{p.description}</p>
              <ul className="mt-4 space-y-2">
                {p.features.map((f, i) => (
                  <li key={`${p.id}-f-${i}`} className="text-body">• {f}</li>
                ))}
              </ul>
              <div className="mt-6">
                <Button className="w-full" onClick={onSelect}>Contratar</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}