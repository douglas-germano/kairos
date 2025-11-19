import { useNotifications, useRemoveNotification } from '../hooks/useNotification'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Componente individual de notificação
 */
const Notification = ({ notification, onClose }) => {
  const { id, message, type, duration } = notification

  // Auto-close se tiver duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const types = {
    success: {
      icon: CheckCircle,
      className: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-500'
    },
    error: {
      icon: AlertCircle,
      className: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      iconColor: 'text-yellow-500'
    },
    info: {
      icon: Info,
      className: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-500'
    }
  }

  const config = types[type] || types.info
  const Icon = config.icon

  return (
    <div
      className={`flex items-start gap-3 p-4 mb-3 rounded-lg border shadow-lg transition-all duration-300 ${config.className}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

/**
 * Container de notificações - deve ser adicionado no App.jsx
 */
export const NotificationContainer = () => {
  const notifications = useNotifications()
  const removeNotification = useRemoveNotification()

  if (notifications.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-50 w-full max-w-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  )
}
