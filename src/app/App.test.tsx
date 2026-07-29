import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the app shell without crashing', async () => {
    render(<App />)
    expect(await screen.findByText('lock.in')).toBeInTheDocument()
  })

  it('shows the Today header on the home route', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: /lock in/i })).toBeInTheDocument()
  })

  it('does not trip the error boundary (settings load is read-only)', async () => {
    render(<App />)
    await screen.findByText('lock.in')
    // Give async liveQueries a chance to settle, then assert no crash screen.
    await waitFor(() => {
      expect(screen.queryByText(/a little weed appeared/i)).not.toBeInTheDocument()
    })
  })
})

