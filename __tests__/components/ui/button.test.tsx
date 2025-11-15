import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByText('Click me')
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should apply default variant styles', () => {
    render(<Button>Default</Button>)
    const button = screen.getByText('Default')

    expect(button).toHaveClass('bg-primary-600')
    expect(button).toHaveClass('text-white')
  })

  it('should apply destructive variant styles', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByText('Delete')

    expect(button).toHaveClass('bg-red-600')
  })

  it('should apply outline variant styles', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByText('Outline')

    expect(button).toHaveClass('border')
    expect(button).toHaveClass('bg-white')
  })

  it('should apply secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByText('Secondary')

    expect(button).toHaveClass('bg-gray-100')
  })

  it('should apply ghost variant styles', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByText('Ghost')

    expect(button).toHaveClass('hover:bg-gray-100')
  })

  it('should apply link variant styles', () => {
    render(<Button variant="link">Link</Button>)
    const button = screen.getByText('Link')

    expect(button).toHaveClass('text-primary-600')
    expect(button).toHaveClass('underline-offset-4')
  })

  it('should apply small size', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByText('Small')

    expect(button).toHaveClass('h-9')
  })

  it('should apply large size', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByText('Large')

    expect(button).toHaveClass('h-12')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByText('Disabled')

    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:opacity-50')
  })

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByText('Custom')

    expect(button).toHaveClass('custom-class')
  })

  it('should render as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )

    const link = screen.getByText('Link Button')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/test')
  })

  it('should have proper accessibility attributes', () => {
    render(<Button aria-label="Test button">Icon</Button>)
    const button = screen.getByLabelText('Test button')

    expect(button).toBeInTheDocument()
  })

  it('should have focus-visible ring', () => {
    render(<Button>Focus me</Button>)
    const button = screen.getByText('Focus me')

    expect(button).toHaveClass('focus-visible:outline-none')
    expect(button).toHaveClass('focus-visible:ring-2')
  })
})
