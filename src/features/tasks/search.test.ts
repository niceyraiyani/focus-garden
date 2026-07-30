import { describe, it, expect } from 'vitest'
import { searchTasks } from './search'
import type { Task, List } from '../../domain/types'

function task(id: string, title: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title,
    notes: '',
    status: 'open',
    listId: null,
    tagIds: [],
    dueDate: null,
    priority: 'none',
    effort: 0,
    sortRank: 1,
    createdAt: 0,
    updatedAt: 0,
    completedAt: null,
    originSessionId: null,
    ...patch,
  }
}

const lists: List[] = [
  { id: 'l1', name: 'Thesis', color: '', icon: 'star', sortRank: 1, archived: false, createdAt: 0, updatedAt: 0 },
]

describe('searchTasks', () => {
  const tasks = [
    task('a', 'Email Sam back'),
    task('b', 'Email Dana about the trip'),
    task('c', 'Read chapter 5', { notes: 'the one about email etiquette' }),
    task('d', 'Outline chapter 3', { listId: 'l1' }),
  ]

  it('returns nothing for an empty query', () => {
    expect(searchTasks(tasks, '   ')).toEqual([])
  })

  it('finds tasks by title', () => {
    const hits = searchTasks(tasks, 'dana')
    expect(hits.map((h) => h.task.id)).toEqual(['b'])
  })

  it('requires every term to match', () => {
    const hits = searchTasks(tasks, 'email sam')
    expect(hits.map((h) => h.task.id)).toEqual(['a'])
  })

  it('ranks a title match above a notes match', () => {
    const hits = searchTasks(tasks, 'email')
    expect(hits[hits.length - 1].task.id).toBe('c')
    expect(hits.map((h) => h.task.id)).toContain('a')
  })

  it('prefers a title that starts with the query', () => {
    const list = [task('x', 'Weekly review'), task('y', 'Do the weekly review')]
    expect(searchTasks(list, 'weekly')[0].task.id).toBe('x')
  })

  it('matches on the list name', () => {
    const hits = searchTasks(tasks, 'thesis', lists)
    expect(hits.map((h) => h.task.id)).toEqual(['d'])
  })

  it('is case insensitive', () => {
    expect(searchTasks(tasks, 'EMAIL SAM').map((h) => h.task.id)).toEqual(['a'])
  })

  it('pushes completed tasks below open ones', () => {
    const list = [
      task('done', 'Review notes', { status: 'completed', completedAt: 1 }),
      task('open', 'Review notes'),
    ]
    expect(searchTasks(list, 'review notes')[0].task.id).toBe('open')
  })

  it('respects the result limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => task(`t${i}`, `Task ${i} report`))
    expect(searchTasks(many, 'report', [], 5)).toHaveLength(5)
  })
})
