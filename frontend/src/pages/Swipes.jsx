import { useState, useEffect, useCallback } from 'react'
import { swipesAPI } from '../services/api'
import { Sparkles, Heart, Globe, Building2 } from 'lucide-react'
import Topbar from '../components/Topbar'

export default function Swipes() {
  const [swipes, setSwipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('global') // 'global' ou 'tenant'

  const loadSwipes = useCallback(async () => {
    try {
      setLoading(true)
      if (activeTab === 'global') {
        const response = await swipesAPI.getGlobal()
        setSwipes(response.data)
      } else {
        // Carregar swipes do tenant
        // Você precisará passar o tenant_id
        setSwipes([])
      }
    } catch (error) {
      console.error('Erro ao carregar swipes:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadSwipes()
  }, [loadSwipes])

  const handleLike = async (swipeId) => {
    try {
      const response = await swipesAPI.like(swipeId)
      setSwipes(
        swipes.map((swipe) =>
          swipe.id === swipeId ? { ...swipe, curtidas: response.data.curtidas } : swipe
        )
      )
    } catch (error) {
      console.error('Erro ao curtir:', error)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Swipes" subtitle="Biblioteca de referências e inspirações">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('global')}
            className={`
              px-4 py-2 border-b-2 transition-all duration-fast
              ${
                activeTab === 'global'
                  ? 'border-primary text-neutral-text font-semibold'
                  : 'border-transparent text-neutral-text-secondary hover:text-neutral-text'
              }
            `}
          >
            <Globe size={18} className="inline mr-2" />
            Global
          </button>
          <button
            onClick={() => setActiveTab('tenant')}
            className={`
              px-4 py-2 border-b-2 transition-all duration-fast
              ${
                activeTab === 'tenant'
                  ? 'border-primary text-neutral-text font-semibold'
                  : 'border-transparent text-neutral-text-secondary hover:text-neutral-text'
              }
            `}
          >
            <Building2 size={18} className="inline mr-2" />
            Minha Organização
          </button>
        </div>
      </Topbar>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-xl">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-neutral-text-secondary">Carregando...</div>
          </div>
        ) : swipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles size={64} className="text-neutral-text-secondary mb-4" />
            <h2 className="text-h3 mb-2">Nenhum swipe encontrado</h2>
            <p className="text-body text-neutral-text-secondary">
              {activeTab === 'global'
                ? 'Ainda não há swipes globais disponíveis'
                : 'Crie swipes para seu tenant'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {swipes.map((swipe) => (
              <div
                key={swipe.id}
                className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 hover:border-primary transition-all duration-fast"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-h3 flex-1">{swipe.titulo}</h3>
                  {activeTab === 'global' && (
                    <button
                      onClick={() => handleLike(swipe.id)}
                      className="flex items-center gap-1 text-neutral-text-secondary hover:text-primary transition-colors"
                    >
                      <Heart size={18} />
                      <span className="text-small">{swipe.curtidas || 0}</span>
                    </button>
                  )}
                </div>
                <p className="text-body text-neutral-text-secondary mb-4 line-clamp-4">
                  {swipe.conteudo}
                </p>
                {swipe.categoria && (
                  <span className="inline-block px-2 py-1 text-small bg-neutral-light-secondary dark:bg-neutral-dark rounded-md text-neutral-text-secondary mb-2">
                    {swipe.categoria}
                  </span>
                )}
                {swipe.url_referencia && (
                  <a
                    href={swipe.url_referencia}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-small text-primary hover:underline block mt-2"
                  >
                    Ver referência →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

