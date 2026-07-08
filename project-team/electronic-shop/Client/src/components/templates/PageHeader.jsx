import Container from 'react-bootstrap/Container'
import PageBadge from '../atoms/PageBadge'

function PageHeader({ eyebrow = 'TechSale', title, description, children }) {
  return (
    <section className='border-bottom bg-white py-5'>
      <Container>
        <div className='max-w-4xl'>
          <PageBadge>{eyebrow}</PageBadge>
          <h1 className='mb-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl'>{title}</h1>
          {description && <p className='mb-0 text-lg text-slate-500'>{description}</p>}
        </div>
        {children}
      </Container>
    </section>
  )
}

export default PageHeader
