package main

import "sync"

type boundedMap[K comparable, V any] struct {
	mu    sync.Mutex
	items map[K]V
	order []K // ring buffer of keys in insertion order
	next  int // position the next new key goes to
	count int // filled positions in order
}

func newBoundedMap[K comparable, V any](limit int) *boundedMap[K, V] {
	return &boundedMap[K, V]{
		items: make(map[K]V),
		order: make([]K, limit),
	}
}

func (m *boundedMap[K, V]) Get(key K) (V, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	value, ok := m.items[key]
	return value, ok
}

func (m *boundedMap[K, V]) Add(key K, value V) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.items[key]; exists {
		return false
	}

	if m.count == len(m.order) {
		delete(m.items, m.order[m.next])
	} else {
		m.count++
	}
	m.order[m.next] = key
	m.next = (m.next + 1) % len(m.order)
	m.items[key] = value
	return true
}

func (m *boundedMap[K, V]) Update(key K, update func(V) (V, error)) (V, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	old, ok := m.items[key]
	if !ok {
		var zero V
		return zero, false, nil
	}
	value, err := update(old)
	if err != nil {
		return old, true, err
	}
	m.items[key] = value
	return value, true, nil
}

func (m *boundedMap[K, V]) Delete(key K) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.items[key]; !ok {
		return false
	}
	delete(m.items, key)
	return true
}

func (m *boundedMap[K, V]) Len() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.items)
}
