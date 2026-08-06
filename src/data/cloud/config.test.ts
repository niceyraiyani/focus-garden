import { describe, it, expect } from 'vitest'
import { normalizeProjectUrl } from './config'

describe('normalizeProjectUrl', () => {
  const want = 'https://abcdefgh1234567890.supabase.co'

  it('leaves a clean project URL alone', () => {
    expect(normalizeProjectUrl(want)).toBe(want)
  })

  it('trims whitespace and trailing slashes', () => {
    expect(normalizeProjectUrl('  https://abcdefgh1234567890.supabase.co/  ')).toBe(want)
    expect(normalizeProjectUrl('https://abcdefgh1234567890.supabase.co///')).toBe(want)
  })

  it('strips the API path the dashboard actually displays', () => {
    // Settings -> Data API shows the URL with /rest/v1/ on the end.
    expect(normalizeProjectUrl('https://abcdefgh1234567890.supabase.co/rest/v1/')).toBe(want)
    expect(normalizeProjectUrl('https://abcdefgh1234567890.supabase.co/rest/v1')).toBe(want)
    expect(normalizeProjectUrl('https://abcdefgh1234567890.supabase.co/auth/v1')).toBe(want)
    expect(normalizeProjectUrl('https://abcdefgh1234567890.supabase.co/storage/v1/')).toBe(want)
  })

  it('adds a scheme when someone pastes a bare host', () => {
    expect(normalizeProjectUrl('abcdefgh1234567890.supabase.co')).toBe(want)
  })

  it('keeps empty input empty so "not configured" still reads as not configured', () => {
    expect(normalizeProjectUrl('')).toBe('')
    expect(normalizeProjectUrl('   ')).toBe('')
  })

  it('does not mangle a self-hosted URL with a real path', () => {
    expect(normalizeProjectUrl('https://supabase.example.com/project-one')).toBe(
      'https://supabase.example.com/project-one',
    )
  })
})
