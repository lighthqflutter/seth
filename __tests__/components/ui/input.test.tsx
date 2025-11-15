import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  it('should render input with label', () => {
    render(<Input label="Email" />)

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('should render input without label', () => {
    render(<Input placeholder="Enter text" />)

    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('should handle value changes', () => {
    const handleChange = jest.fn()
    render(<Input label="Name" onChange={handleChange} />)

    const input = screen.getByLabelText('Name')
    fireEvent.change(input, { target: { value: 'John Doe' } })

    expect(handleChange).toHaveBeenCalled()
  })

  it('should display error message', () => {
    render(<Input label="Email" error="Invalid email" />)

    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })

  it('should apply error styles when error prop is present', () => {
    render(<Input label="Email" error="Invalid email" />)

    const input = screen.getByLabelText('Email')
    expect(input).toHaveClass('border-red-500')
  })

  it('should display error text in red', () => {
    render(<Input label="Email" error="Invalid email" />)

    const errorText = screen.getByText('Invalid email')
    expect(errorText).toHaveClass('text-red-600')
  })

  it('should be required when required prop is true', () => {
    render(<Input label="Email" required />)

    const input = screen.getByLabelText(/email/i)
    expect(input).toBeRequired()
  })

  it('should show asterisk for required fields', () => {
    render(<Input label="Email" required />)

    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input label="Email" disabled />)

    const input = screen.getByLabelText('Email')
    expect(input).toBeDisabled()
  })

  it('should apply different input types', () => {
    const { rerender } = render(<Input label="Email" type="email" />)
    let input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('type', 'email')

    rerender(<Input label="Password" type="password" />)
    input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')

    rerender(<Input label="Number" type="number" />)
    input = screen.getByLabelText('Number')
    expect(input).toHaveAttribute('type', 'number')
  })

  it('should apply placeholder text', () => {
    render(<Input label="Email" placeholder="john@example.com" />)

    const input = screen.getByPlaceholderText('john@example.com')
    expect(input).toBeInTheDocument()
  })

  it('should have proper height for touch targets', () => {
    render(<Input label="Email" />)

    const input = screen.getByLabelText('Email')
    expect(input).toHaveClass('h-11') // 44px minimum touch target
  })

  it('should have focus ring styles', () => {
    render(<Input label="Email" />)

    const input = screen.getByLabelText('Email')
    expect(input).toHaveClass('focus:outline-none')
    expect(input).toHaveClass('focus:ring-2')
    expect(input).toHaveClass('focus:ring-primary-500')
  })

  it('should apply custom className to wrapper', () => {
    render(<Input label="Email" className="custom-wrapper" />)

    const wrapper = screen.getByText('Email').closest('div')
    expect(wrapper).toHaveClass('space-y-2')
    expect(wrapper).toHaveClass('custom-wrapper')
  })

  it('should forward ref to input element', () => {
    const ref = jest.fn()
    render(<Input label="Email" ref={ref} />)

    expect(ref).toHaveBeenCalled()
  })
})
