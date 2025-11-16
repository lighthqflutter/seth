import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">SETH</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button>Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Modern School Management
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Manage students, scores, and results from anywhere. Built for Nigerian schools with mobile-first design.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg">Login to Your School Portal</Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-600">
            New school? <Link href="/contact" className="text-blue-600 font-medium hover:underline">Contact us to get started →</Link>
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">📊</div>
              <CardTitle>Real-time Updates</CardTitle>
              <CardDescription>
                See changes instantly as teachers enter scores and generate results
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">👥</div>
              <CardTitle>Multi-tenant</CardTitle>
              <CardDescription>
                Each school gets their own portal with custom branding and subdomain
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">📱</div>
              <CardTitle>Mobile First</CardTitle>
              <CardDescription>
                Works perfectly on phones, tablets, and desktops with responsive design
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">🔒</div>
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Bank-level security with automatic data isolation between schools
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">📄</div>
              <CardTitle>PDF Reports</CardTitle>
              <CardDescription>
                Generate beautiful result cards with school branding in seconds
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">💰</div>
              <CardTitle>Affordable</CardTitle>
              <CardDescription>
                Flexible pay as you go termly pricing - much cheaper than legacy solutions
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600">
            © 2025 SETH SchoolPortal. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
