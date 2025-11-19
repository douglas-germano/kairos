import { useState, useCallback } from 'react'

/**
 * Hook para gerenciar paginação
 */
export const usePagination = (initialItemsPerPage = 50) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)
  const [totalItems, setTotalItems] = useState(0)

  // Calcula offset para API
  const offset = (currentPage - 1) * itemsPerPage

  // Reseta para primeira página
  const resetPagination = useCallback(() => {
    setCurrentPage(1)
  }, [])

  // Muda página
  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage)
  }, [])

  // Muda itens por página
  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Volta pra primeira página
  }, [])

  // Atualiza total de itens
  const updateTotalItems = useCallback((total) => {
    setTotalItems(total)
  }, [])

  // Retorna params para API
  const getPaginationParams = useCallback(() => {
    return {
      offset,
      limit: itemsPerPage
    }
  }, [offset, itemsPerPage])

  return {
    // State
    currentPage,
    itemsPerPage,
    totalItems,
    offset,

    // Computed
    totalPages: Math.ceil(totalItems / itemsPerPage),

    // Methods
    handlePageChange,
    handleItemsPerPageChange,
    resetPagination,
    updateTotalItems,
    getPaginationParams
  }
}
