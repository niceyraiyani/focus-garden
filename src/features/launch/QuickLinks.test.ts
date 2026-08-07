import { describe, it, expect } from 'vitest'
import { labelFor, toUrl } from './QuickLinks'

describe('quick link labels', () => {
  it('uses the distinctive part of the host', () => {
    expect(labelFor('https://github.com')).toBe('github')
    expect(labelFor('https://www.github.com/niceyraiyani')).toBe('github')
    expect(labelFor('https://mail.google.com/mail/u/0')).toBe('mail')
    expect(labelFor('https://calendar.google.com')).toBe('calendar')
  })

  it('falls back sensibly on junk instead of throwing', () => {
    expect(labelFor('not a url')).toBe('not a url')
    expect(labelFor('')).toBe('link')
  })
})

describe('quick link urls', () => {
  it('accepts a bare host', () => {
    expect(toUrl('github.com')).toBe('https://github.com')
    expect(toUrl('  notion.so  ')).toBe('https://notion.so')
  })

  it('leaves a real url alone', () => {
    expect(toUrl('https://x.com/home')).toBe('https://x.com/home')
    expect(toUrl('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('treats empty input as no link', () => {
    expect(toUrl('   ')).toBe('')
  })
})
