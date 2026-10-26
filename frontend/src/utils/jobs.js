import { useSyncExternalStore } from 'react'
import toast from 'react-hot-toast'

// Long AI requests (roadmap, quiz, interview questions) live here instead of in page state.
// A page that unmounts mid-request (the student opens another page) would otherwise lose the
// "generating…" state and the result; with the job kept outside React, the request keeps
// running, a toast announces the result wherever the student is, and the page picks the job
// back up when it mounts again.
//
// A job is { status: 'running' | 'done' | 'error', meta, result?, error? }, replaced (never
// mutated) on every change so useSyncExternalStore sees a new snapshot.

const jobs = new Map()
const listeners = new Set()

const emit = () => listeners.forEach((l) => l())
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

/**
 * Starts `fn` under `key` unless a job with that key is already running.
 * `meta` is whatever the page needs to restore its form (e.g. the chosen topic).
 * `doneMessage` is toasted on success; errors toast the server's message.
 */
export function startJob(key, fn, { meta, doneMessage } = {}) {
  if (jobs.get(key)?.status === 'running') return
  jobs.set(key, { status: 'running', meta })
  emit()
  fn().then(
    (result) => {
      jobs.set(key, { status: 'done', meta, result })
      if (doneMessage) toast.success(doneMessage)
      emit()
    },
    (error) => {
      jobs.set(key, { status: 'error', meta, error })
      toast.error(error?.response?.data?.message || 'Something went wrong. Please try again.')
      emit()
    }
  )
}

/** Forget a finished job once the page has shown its result. */
export function clearJob(key) {
  if (jobs.get(key)?.status === 'running') return
  if (jobs.delete(key)) emit()
}

/** The current job for `key` (or undefined); re-renders when it changes. */
export function useJob(key) {
  return useSyncExternalStore(subscribe, () => jobs.get(key))
}
