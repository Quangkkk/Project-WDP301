import Card from 'react-bootstrap/Card'

function AuthPanel({ title, subtitle, children }) {
  return (
    <Card className='card-surface'>
      <Card.Body className='p-4 p-md-5'>
        <div className='mb-4 text-center'>
          <div className='mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-4 bg-blue-600 text-2xl text-white'>⚡</div>
          <h1 className='mb-2 text-3xl font-black text-slate-950'>{title}</h1>
          {subtitle && <p className='mb-0 text-slate-500'>{subtitle}</p>}
        </div>
        {children}
      </Card.Body>
    </Card>
  )
}

export default AuthPanel
