'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { GripVertical, Plus, Trash2, AlertCircle, ListOrdered, ArrowUp, ArrowDown } from 'lucide-react'
import { ProtectedRoute, useAuth } from '../../../lib/auth'
import AdminLayout from '../../../components/AdminLayout'
import ConfirmDialog from '../../../components/ConfirmDialog'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  type Category,
} from '../../../lib/api'

function CategoriesContent() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [savingNew, setSavingNew] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const editInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      setCategories(await getCategories(user.restaurant_id))
      // Cleared only once there is something to replace it with, so a retry
      // does not blank the message before it is known to have worked.
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your categories.')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Client-side fetch on mount. The rule steers towards a data library or a
  // server component; neither fits here, because this page needs the client
  // auth state to know which restaurant to ask for. Every setState in load()
  // happens after an await, so there is no synchronous cascading render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  async function handleAdd() {
    if (!newName.trim() || !user) return
    setSavingNew(true)
    setActionError('')
    try {
      await createCategory(user.restaurant_id, { name: newName.trim() })
      setNewName('')
      setAdding(false)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That category could not be added.')
    } finally {
      setSavingNew(false)
    }
  }

  async function saveEdit(category: Category) {
    const value = editValue.trim()
    setEditingId(null)
    if (!user || !value || value === category.name) return
    setActionError('')
    try {
      await updateCategory(user.restaurant_id, category.id, { name: value })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That rename did not save.')
    }
  }

  async function handleDelete() {
    if (!user || !pendingDelete) return
    setDeleting(true)
    setActionError('')
    try {
      await deleteCategory(user.restaurant_id, pendingDelete.id)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That category could not be deleted.')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  /** Shared by drag-and-drop and the keyboard move buttons. */
  const persistOrder = useCallback(
    async (ordered: Category[]) => {
      if (!user) return
      const previous = categories
      setCategories(ordered)
      setActionError('')
      try {
        // One request for the whole order: N parallel PATCHes used to trip
        // the rate limiter and could leave the list half-reordered.
        setCategories(await reorderCategories(user.restaurant_id, ordered.map((c) => c.id)))
      } catch (err) {
        setCategories(previous)
        setActionError(err instanceof Error ? err.message : 'That order did not save.')
      }
    },
    [user, categories]
  )

  function handleDragEnd(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index) return
    const next = Array.from(categories)
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    void persistOrder(next)
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= categories.length) return
    const next = Array.from(categories)
    ;[next[index], next[target]] = [next[target], next[index]]
    void persistOrder(next)
  }

  if (loading) {
    return (
      <div className="max-w-lg space-y-3">
        <div className="skeleton h-10 w-40 rounded-xl" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
        <span className="sr-only" role="status">
          Loading categories
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg rounded-xl border border-line bg-surface-card p-8 text-center shadow-card">
        <AlertCircle size={28} className="mx-auto mb-3 text-critical" aria-hidden />
        <h2 className="font-display text-lg font-bold text-ink">Could not load your categories</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{error}</p>
        <button type="button" onClick={() => void load()} className="btn btn-primary mt-5">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Categories</h2>
        <p className="text-sm text-ink-muted">
          Drag to reorder, or use the arrows. Click a name to rename it.
        </p>
      </div>

      {actionError && (
        <div role="alert" className="alert alert-error">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{actionError}</span>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface-card py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-wash">
            <ListOrdered size={22} className="text-accent-deep" aria-hidden />
          </div>
          <p className="font-display text-base font-bold text-ink">No categories yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">
            Categories group your menu into sections such as Starters or Desserts. Products
            without one appear under “More”.
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(droppable) => (
              <ul
                ref={droppable.innerRef}
                {...droppable.droppableProps}
                className="space-y-2"
              >
                {categories.map((category, index) => (
                  <Draggable key={category.id} draggableId={category.id} index={index}>
                    {(draggable, snapshot) => (
                      <li
                        ref={draggable.innerRef}
                        {...draggable.draggableProps}
                        className={`flex items-center gap-3 rounded-xl border border-line bg-surface-card px-4 py-3 ${
                          snapshot.isDragging ? 'shadow-raised' : 'shadow-card'
                        }`}
                        style={draggable.draggableProps.style}
                      >
                        <span
                          {...draggable.dragHandleProps}
                          className="shrink-0 cursor-grab text-ink-muted active:cursor-grabbing"
                          aria-label={`Drag ${category.name} to reorder`}
                        >
                          <GripVertical size={16} aria-hidden />
                        </span>

                        {editingId === category.id ? (
                          <input
                            ref={editInputRef}
                            className="field flex-1"
                            value={editValue}
                            maxLength={60}
                            aria-label={`Rename ${category.name}`}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => void saveEdit(category)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void saveEdit(category)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="flex-1 rounded-md text-left text-sm font-medium text-ink"
                            onClick={() => {
                              setEditingId(category.id)
                              setEditValue(category.name)
                            }}
                          >
                            {category.name}
                            <span className="sr-only">. Click to rename</span>
                          </button>
                        )}

                        <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted">
                          {category._count?.products ?? 0}
                          <span className="sr-only"> live products</span>
                        </span>

                        {/* Keyboard-accessible equivalent of dragging. */}
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => move(index, -1)}
                            disabled={index === 0}
                            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-30"
                            aria-label={`Move ${category.name} up`}
                          >
                            <ArrowUp size={14} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(index, 1)}
                            disabled={index === categories.length - 1}
                            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-30"
                            aria-label={`Move ${category.name} down`}
                          >
                            <ArrowDown size={14} aria-hidden />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPendingDelete(category)}
                          className="shrink-0 rounded-md p-2 text-critical transition-colors hover:bg-critical-wash"
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {droppable.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            className="field flex-1"
            placeholder="Category name"
            aria-label="New category name"
            value={newName}
            maxLength={60}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd()
              if (e.key === 'Escape') {
                setAdding(false)
                setNewName('')
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={savingNew || !newName.trim()}
            className="btn btn-primary shrink-0"
          >
            {savingNew ? 'Adding…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setNewName('')
            }}
            className="btn btn-ghost shrink-0"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-accent-deep"
        >
          <Plus size={16} aria-hidden />
          Add category
        </button>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this category?"
        body={
          (pendingDelete?._count?.products ?? 0) > 0
            ? `“${pendingDelete?.name}” has ${pendingDelete?._count?.products} product(s). They will not be deleted. They move to the “More” section of your menu.`
            : `“${pendingDelete?.name}” will be removed from your menu.`
        }
        confirmLabel="Delete category"
        destructive
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}

export default function CategoriesPage() {
  return (
    <ProtectedRoute>
      <AdminLayout title="Categories">
        <CategoriesContent />
      </AdminLayout>
    </ProtectedRoute>
  )
}
