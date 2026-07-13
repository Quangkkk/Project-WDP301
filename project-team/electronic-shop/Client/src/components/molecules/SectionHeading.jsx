import PageBadge from '../atoms/PageBadge'

function SectionHeading({ eyebrow, title, description, align = 'start', action }) {
  return (
    <div className={`mb-4 d-flex flex-column flex-lg-row gap-3 ${align === 'center' ? 'text-center align-items-center justify-content-center' : 'align-items-lg-end justify-content-between'}`}>
      <div className={align === 'center' ? 'mx-auto max-w-3xl' : 'max-w-3xl'}>
        {eyebrow && <PageBadge>{eyebrow}</PageBadge>}
        <h2 className='mb-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl'>{title}</h2>
        {description && <p className='mb-0 text-slate-500'>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export default SectionHeading
