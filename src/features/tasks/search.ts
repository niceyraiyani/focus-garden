import type { Task, List } from '../../domain/types'

export interface SearchHit {
  task: Task
  /** Higher is a better match. */
  score: number
}

function normalize(s: string): string {
  return s.toLowerCase().trim()
}

/**
 * Score a single task against a query. Returns 0 when it doesn't match.
 *
 * Ranking favours, in order: a title that starts with the query, a title that
 * contains it, then a match in the notes. Open tasks outrank completed ones so
 * finishing something doesn't push it to the top of your results.
 */
function scoreTask(task: Task, q: string, listName: string): number {
  const title = normalize(task.title)
  const notes = normalize(task.notes)
  const list = normalize(listName)

  let score = 0
  if (title === q) score = 100
  else if (title.startsWith(q)) score = 80
  else if (title.includes(q)) score = 60
  else if (notes.includes(q)) score = 30
  else if (list.includes(q)) score = 20
  else return 0

  if (task.status === 'completed') score -= 25
  // Nudge shorter titles up: "Email Sam" beats "Email Sam about the thing".
  score += Math.max(0, 10 - title.length / 12)
  return score
}

/**
 * Find tasks matching a query, best first. Every whitespace-separated term must
 * match somewhere, so "email sam" finds "Email Sam back" but not "Email Dana".
 */
export function searchTasks(
  tasks: Task[],
  query: string,
  lists: List[] = [],
  limit = 8,
): SearchHit[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const listName = new Map(lists.map((l) => [l.id, l.name]))

  const hits: SearchHit[] = []
  for (const task of tasks) {
    const name = task.listId ? (listName.get(task.listId) ?? '') : 'Inbox'
    let total = 0
    let matchedAll = true
    for (const t of terms) {
      const s = scoreTask(task, t, name)
      if (s === 0) {
        matchedAll = false
        break
      }
      total += s
    }
    if (matchedAll) hits.push({ task, score: total / terms.length })
  }

  return hits
    .sort((a, b) => b.score - a.score || a.task.title.localeCompare(b.task.title))
    .slice(0, limit)
}
