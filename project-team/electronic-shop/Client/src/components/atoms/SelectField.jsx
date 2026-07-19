import Form from 'react-bootstrap/Form'

function SelectField({ label, id, error, options = [], className = '', ...props }) {
  return (
    <Form.Group className={className} controlId={id}>
      {label && <Form.Label className='mb-2 text-sm font-bold text-slate-700'>{label}</Form.Label>}
      <Form.Select className={`!rounded-4 border-slate-200 px-4 py-3 shadow-sm ${error ? 'border-danger' : ''}`} {...props}>
        {options.map((option) => <option value={option.value} key={`${option.value}-${option.label}`}>{option.label}</option>)}
      </Form.Select>
      {error && <Form.Text className='text-danger'>{error}</Form.Text>}
    </Form.Group>
  )
}

export default SelectField
