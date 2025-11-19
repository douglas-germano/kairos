export default function Topbar({ title, subtitle, children, className = '' }) {
  return (
    <div className={`h-[72px] px-xl bg-neutral-light dark:bg-neutral-dark border-b border-neutral-border dark:border-neutral-border-dark ${className}`}>
      <div className="h-full flex items-center justify-between">
        <div>
          {title && <h1 className="text-h2">{title}</h1>}
          {subtitle && <p className="text-caption text-neutral-text-secondary mt-1">{subtitle}</p>}
        </div>
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}