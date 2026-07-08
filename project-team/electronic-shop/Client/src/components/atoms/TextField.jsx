import Form from 'react-bootstrap/Form'

function TextField({ label, id, error, className = '', ...props }) {
  return (
    <Form.Group className={className} controlId={id}>
      {label && <Form.Label className='mb-2 text-sm font-bold text-slate-700'>{label}</Form.Label>}
      <Form.Control className={`rounded-4 border-slate-200 px-4 py-3 shadow-sm ${error ? 'border-danger' : ''}`} {...props} />
      {error && <Form.Text className='text-danger'>{error}</Form.Text>}
    </Form.Group>
  )
}

export default TextField
