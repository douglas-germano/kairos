export default function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  ...props 
}) {
  const baseClasses = 'px-5 py-2.5 rounded-md text-body font-semibold transition-all duration-fast disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary text-neutral-text hover:bg-primary-dark dark:bg-primary-dark dark:hover:bg-primary',
    secondary: 'bg-transparent border border-neutral-border dark:border-neutral-border-dark text-neutral-text hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary',
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

