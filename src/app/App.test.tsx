import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the app shell without crashing', async () => {
    render(<App />)
    expect(await screen.findByText('focus garden')).toBeInTheDocument()
  })

  it('shows the Today greeting on the home route', async () => {
    render(<App />)
    // Any time-of-day greeting ends up on screen.
    expect(await screen.findByText(/morning|afternoon|evening|up\?|down\?/i)).toBeInTheDocument()
  })
})
