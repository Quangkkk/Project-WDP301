import Card from 'react-bootstrap/Card'

function StatCard({ icon = '📊', label, value, helper }) {
  return (
    <Card className='card-surface h-100'>
      <Card.Body className='p-4'>
        <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-4 bg-blue-50 text-2xl'>{icon}</div>
        <p className='mb-1 text-sm font-bold text-slate-500'>{label}</p>
        <h3 className='mb-1 text-3xl font-black text-slate-950'>{value}</h3>
        {helper && <p className='mb-0 text-sm text-slate-500'>{helper}</p>}
      </Card.Body>
    </Card>
  )
}

export default StatCard
