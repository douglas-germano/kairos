import { create } from 'zustand'

/**
 * Store global para notificações
 */
const useNotificationStore = create((set) => ({
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: Date.now() }
      ]
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    })),
  clearNotifications: () => set({ notifications: [] })
}))

/**
 * Hook para gerenciar notificações
 */
export const useNotification = () => {
  const { addNotification, removeNotification, clearNotifications } = useNotificationStore()

  const showNotification = (message, type = 'info', duration = 5000) => {
    const notification = {
      message,
      type,
      duration
    }
    addNotification(notification)

    // Auto-remove após duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(notification.id)
      }, duration)
    }
  }

  const showSuccess = (message, duration) => showNotification(message, 'success', duration)
  const showError = (message, duration) => showNotification(message, 'error', duration)
  const showWarning = (message, duration) => showNotification(message, 'warning', duration)
  const showInfo = (message, duration) => showNotification(message, 'info', duration)

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearNotifications
  }
}

/**
 * Hook para acessar as notificações (usado no componente de display)
 */
export const useNotifications = () => {
  return useNotificationStore((state) => state.notifications)
}

/**
 * Hook para remover notificação (usado no componente de display)
 */
export const useRemoveNotification = () => {
  return useNotificationStore((state) => state.removeNotification)
}
