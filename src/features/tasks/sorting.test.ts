import { describe, it, expect } from 'vitest'
import { sortTasks, filterTasks } from './sorting'
import type { Task } from '../../domain/types'

function task(p: Partial<Task>): Task {
  return {
    id: p.id ?? Math.random().toString(),
    title: p.title ?? 'task',
    notes: '',
    status: 'open',
    listId: null,
    tagIds: p.tagIds ?? [],
    dueDate: p.dueDate ?? null,
    priority: p.priority ?? 'none',
    effort: p.effort ?? 0,
    sortRank: p.sortRank ?? 0,
    createdAt: p.createdAt ?? 0,
    updatedAt: 0,
    completedAt: null,
    originSessionId: null,
  }
}

describe('sortTasks', () => {
  it('manual sort follows sortRank', () => {
    const out = sortTasks([task({ id: 'b', sortRank: 20 }), task({ id: 'a', sortRank: 10 })], 'manual')
    expect(out.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('due sort puts dated tasks first, nulls last', () => {
    const out = sortTasks(
      [
        task({ id: 'none' }),
        task({ id: 'late', dueDate: '2026-02-01' }),
        task({ id: 'soon', dueDate: '2026-01-01' }),
      ],
      'due',
    )
    expect(out.map((t) => t.id)).toEqual(['soon', 'late', 'none'])
  })

  it('priority sort orders high > medium > low > none', () => {
    const out = sortTasks(
      [task({ id: 'n' }), task({ id: 'h', priority: 'high' }), task({ id: 'm', priority: 'medium' })],
      'priority',
    )
    expect(out.map((t) => t.id)).toEqual(['h', 'm', 'n'])
  })

  it('effort sort orders lower effort first, unset last', () => {
    const out = sortTasks(
      [task({ id: 'big', effort: 5 }), task({ id: 'unset', effort: 0 }), task({ id: 'tiny', effort: 1 })],
      'effort',
    )
    expect(out.map((t) => t.id)).toEqual(['tiny', 'big', 'unset'])
  })

  it('created sort is newest first', () => {
    const out = sortTasks([task({ id: 'old', createdAt: 1 }), task({ id: 'new', createdAt: 2 })], 'created')
    expect(out.map((t) => t.id)).toEqual(['new', 'old'])
  })

  it('does not mutate the input array', () => {
    const input = [task({ id: 'b', sortRank: 2 }), task({ id: 'a', sortRank: 1 })]
    sortTasks(input, 'manual')
    expect(input[0].id).toBe('b')
  })
})

describe('filterTasks', () => {
  it('filters by tag and priority', () => {
    const tasks = [
      task({ id: 'x', tagIds: ['t1'], priority: 'high' }),
      task({ id: 'y', tagIds: ['t2'], priority: 'low' }),
    ]
    expect(filterTasks(tasks, { tagId: 't1', priority: null }).map((t) => t.id)).toEqual(['x'])
    expect(filterTasks(tasks, { tagId: null, priority: 'low' }).map((t) => t.id)).toEqual(['y'])
    expect(filterTasks(tasks, { tagId: null, priority: null })).toHaveLength(2)
  })
})
