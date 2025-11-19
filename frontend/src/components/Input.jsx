export default function Input({ 
  label, 
  error, 
  className = '', 
  ...props 
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-caption text-neutral-text-secondary mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3.5 py-2.5 rounded-md 
          bg-neutral-light dark:bg-neutral-dark-secondary 
          border border-neutral-border dark:border-neutral-border-dark
          text-body text-neutral-text
          placeholder:text-neutral-text-secondary
          focus:outline-none focus:border-primary
          transition-all duration-fast
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-small text-red-500">{error}</p>
      )}
    </div>
  )
}

