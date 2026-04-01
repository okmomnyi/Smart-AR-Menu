'use client'

import React, { useEffect, useState, useRef } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'
import { AuthProvider, ProtectedRoute, useAuth } from '../../../lib/auth'
import AdminLayout from '../../../components/AdminLayout'
import {
  getCategories,
  getProducts,
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
} from '../../../lib/api'

function CategoriesContent() {
  const { userRecord, getToken } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [savingNew, setSavingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    if (!userRecord) return
    try {
      const token = await getToken()
      const [cats, prods] = await Promise.all([
        getCategories(userRecord.restaurant_id, token),
        getProducts(userRecord.restaurant_id, token),
      ])
      setCategories(cats)
      const counts: Record<string, number> = {}
      prods.forEach((p) => {
        if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1
      })
      setProductCounts(counts)
    } catch {
      // keep state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userRecord]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

  async function handleAdd() {
    if (!newName.trim() || !userRecord) return
    setSavingNew(true)
    try {
      const token = await getToken()
      await createCategory(userRecord.restaurant_id, { name: newName.trim(), order: categories.length }, token)
      setNewName('')
      setAddingNew(false)
      await load()
    } catch {
      // ignore
    } finally {
      setSavingNew(false)
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditValue(cat.name)
  }

  async function saveEdit(cat: Category) {
    if (!editValue.trim() || editValue.trim() === cat.name || !userRecord) {
      setEditingId(null)
      return
    }
    try {
      const token = await getToken()
      await updateCategory(userRecord.restaurant_id, cat.id, { name: editValue.trim() }, token)
      await load()
    } catch {
      // ignore
    } finally {
      setEditingId(null)
    }
  }

  async function handleDelete(cat: Category) {
    if (!userRecord) return
    const count = productCounts[cat.id] ?? 0
    const msg = count > 0
      ? `Delete "${cat.name}"? ${count} product(s) will become uncategorized.`
      : `Delete "${cat.name}"?`
    if (!window.confirm(msg)) return
    setDeletingId(cat.id)
    try {
      const token = await getToken()
      await deleteCategory(userRecord.restaurant_id, cat.id, token)
      await load()
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination || !userRecord) return
    const reordered = Array.from(categories)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    setCategories(reordered)

    try {
      const token = await getToken()
      await Promise.all(
        reordered.map((cat, index) =>
          updateCategory(userRecord.restaurant_id, cat.id, { order: index }, token)
        )
      )
    } catch {
      // revert if failed
      await load()
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'white',
    border: '1px solid rgba(61,43,31,0.2)',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.875rem',
    color: '#1A1814',
    outline: 'none',
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-lg">
        <div className="skeleton-admin h-9 w-40 rounded-xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-admin h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1A1814' }}>
          Categories
        </h2>
        <p className="text-sm" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
          Drag to reorder · click name to edit
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {categories.length === 0 && (
                <div
                  className="rounded-xl py-10 text-center"
                  style={{ background: 'white', border: '1px dashed rgba(61,43,31,0.2)' }}
                >
                  <p className="text-sm" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
                    No categories yet. Add one below.
                  </p>
                </div>
              )}
              {categories.map((cat, index) => (
                <Draggable key={cat.id} draggableId={cat.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-shadow"
                      style={{
                        background: 'white',
                        border: '1px solid rgba(61,43,31,0.08)',
                        boxShadow: snapshot.isDragging
                          ? '0 8px 24px rgba(61,43,31,0.15)'
                          : '0 1px 4px rgba(61,43,31,0.05)',
                        ...provided.draggableProps.style,
                      }}
                    >
                      {/* Drag handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="flex-shrink-0 cursor-grab active:cursor-grabbing"
                        style={{ color: '#C8BEB5' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </div>

                      {/* Name / edit input */}
                      {editingId === cat.id ? (
                        <input
                          ref={editInputRef}
                          style={inputStyle}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(cat)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(cat)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                      ) : (
                        <button
                          className="flex-1 text-left text-sm font-medium transition-colors hover:text-amber-DEFAULT"
                          style={{ color: '#1A1814', fontFamily: 'DM Sans, sans-serif', background: 'none', border: 'none', cursor: 'text' }}
                          onClick={() => startEdit(cat)}
                        >
                          {cat.name}
                        </button>
                      )}

                      {/* Product count */}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(61,43,31,0.06)', color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {productCounts[cat.id] ?? 0}
                      </span>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(cat)}
                        disabled={deletingId === cat.id}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-50"
                        style={{ color: '#C14B1E' }}
                      >
                        {deletingId === cat.id ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin block" style={{ borderColor: '#C14B1E', borderTopColor: 'transparent' }} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add new */}
      {addingNew ? (
        <div className="flex gap-2">
          <input
            autoFocus
            style={inputStyle}
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAddingNew(false); setNewName('') }
            }}
          />
          <button
            onClick={handleAdd}
            disabled={savingNew || !newName.trim()}
            className="btn-amber px-4 py-2 text-sm flex-shrink-0"
          >
            {savingNew ? '…' : 'Add'}
          </button>
          <button
            onClick={() => { setAddingNew(false); setNewName('') }}
            className="px-3 py-2 rounded-full text-sm border flex-shrink-0"
            style={{ borderColor: 'rgba(61,43,31,0.2)', color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: '#D4820A', fontFamily: 'DM Sans, sans-serif' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Category
        </button>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AdminLayout title="Categories">
          <CategoriesContent />
        </AdminLayout>
      </ProtectedRoute>
    </AuthProvider>
  )
}
