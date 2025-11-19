import { useState, useCallback } from 'react'

/**
 * Hook para validação de formulários
 * Integra com as validações do backend (Pydantic)
 */
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validadores comuns
  const validators = {
    required: (value) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return 'Este campo é obrigatório'
      }
      return null
    },

    email: (value) => {
      if (!value) return null
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return 'Email inválido'
      }
      return null
    },

    minLength: (min) => (value) => {
      if (!value) return null
      if (value.length < min) {
        return `Mínimo de ${min} caracteres`
      }
      return null
    },

    maxLength: (max) => (value) => {
      if (!value) return null
      if (value.length > max) {
        return `Máximo de ${max} caracteres`
      }
      return null
    },

    min: (min) => (value) => {
      if (value === null || value === undefined || value === '') return null
      if (parseFloat(value) < min) {
        return `Valor mínimo: ${min}`
      }
      return null
    },

    max: (max) => (value) => {
      if (value === null || value === undefined || value === '') return null
      if (parseFloat(value) > max) {
        return `Valor máximo: ${max}`
      }
      return null
    },

    pattern: (regex, message = 'Formato inválido') => (value) => {
      if (!value) return null
      if (!regex.test(value)) {
        return message
      }
      return null
    },

    custom: (fn) => fn
  }

  // Valida um campo específico
  const validateField = useCallback((name, value) => {
    const fieldRules = validationRules[name]
    if (!fieldRules) return null

    for (const rule of fieldRules) {
      const error = rule(value)
      if (error) return error
    }

    return null
  }, [validationRules])

  // Valida todos os campos
  const validateAll = useCallback(() => {
    const newErrors = {}
    let isValid = true

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName, values[fieldName])
      if (error) {
        newErrors[fieldName] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }, [values, validateField, validationRules])

  // Manipula mudança de valor
  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }))

    // Valida campo se já foi tocado
    if (touched[name]) {
      const error = validateField(name, value)
      setErrors(prev => ({
        ...prev,
        [name]: error
      }))
    }
  }, [touched, validateField])

  // Manipula evento de input
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    handleChange(name, type === 'checkbox' ? checked : value)
  }, [handleChange])

  // Marca campo como tocado
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }))

    // Valida ao sair do campo
    const error = validateField(name, values[name])
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }, [values, validateField])

  // Manipula evento de blur
  const handleInputBlur = useCallback((e) => {
    handleBlur(e.target.name)
  }, [handleBlur])

  // Manipula submit
  const handleSubmit = useCallback(async (onSubmit) => {
    return async (e) => {
      e?.preventDefault()

      // Marca todos campos como tocados
      const allTouched = Object.keys(validationRules).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {})
      setTouched(allTouched)

      // Valida todos os campos
      const isValid = validateAll()

      if (!isValid) {
        return
      }

      setIsSubmitting(true)

      try {
        await onSubmit(values)
      } catch (error) {
        // Se o erro vier do backend (Pydantic), mapeia os erros
        if (error.response?.data?.details) {
          const backendErrors = {}
          const details = error.response.data.details

          if (Array.isArray(details)) {
            details.forEach(err => {
              const fieldName = err.loc?.[err.loc.length - 1]
              if (fieldName) {
                backendErrors[fieldName] = err.msg
              }
            })
          }

          setErrors(prev => ({ ...prev, ...backendErrors }))
        }
      } finally {
        setIsSubmitting(false)
      }
    }
  }, [values, validateAll, validationRules])

  // Reseta formulário
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  // Seta valores programaticamente
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }, [])

  // Seta erro programaticamente
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }))
  }, [])

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,

    // Validadores para usar nas rules
    validators,

    // Methods
    handleChange,
    handleInputChange,
    handleBlur,
    handleInputBlur,
    handleSubmit,
    validateField,
    validateAll,
    reset,
    setFieldValue,
    setFieldError,
    setValues,
    setErrors
  }
}
