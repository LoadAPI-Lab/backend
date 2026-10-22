package main

import (
	"errors"
	"net/http"
	"slices"
	"strconv"
	"sync/atomic"
	"time"
)

const maxTasks = 100_000

var taskStatuses = []string{"todo", "in_progress", "done"}

type task struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	owner     string
}

type taskStore struct {
	tasks  *boundedMap[int64, task]
	lastID atomic.Int64
}

type createTaskRequest struct {
	Title  string `json:"title"`
	Status string `json:"status"`
}

type updateTaskRequest struct {
	Title  *string `json:"title"`
	Status *string `json:"status"`
}

var errInvalidStatus = errors.New("status must be one of: todo, in_progress, done")

func newTaskStore() *taskStore {
	return &taskStore{tasks: newBoundedMap[int64, task](maxTasks)}
}

func (s *taskStore) handleCreate(w http.ResponseWriter, r *http.Request) {
	var req createTaskRequest
	if !readJSON(w, r, &req) {
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if req.Status == "" {
		req.Status = "todo"
	}
	if !slices.Contains(taskStatuses, req.Status) {
		writeError(w, http.StatusBadRequest, errInvalidStatus.Error())
		return
	}

	t := task{
		ID:        s.lastID.Add(1),
		Title:     req.Title,
		Status:    req.Status,
		CreatedAt: time.Now().UTC().Truncate(time.Millisecond),
		owner:     ownerFrom(r),
	}
	s.tasks.Add(t.ID, t)
	writeJSON(w, http.StatusCreated, dataResponse{Data: t})
}

func (s *taskStore) handleGet(w http.ResponseWriter, r *http.Request) {
	t, ok := s.find(r)
	if !ok {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	writeJSON(w, http.StatusOK, dataResponse{Data: t})
}

func (s *taskStore) handleUpdate(w http.ResponseWriter, r *http.Request) {
	id, ok := taskID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	var req updateTaskRequest
	if !readJSON(w, r, &req) {
		return
	}

	owner := ownerFrom(r)
	updated, found, err := s.tasks.Update(id, func(t task) (task, error) {
		if t.owner != owner {
			return t, errNotOwner
		}
		if req.Title != nil {
			t.Title = *req.Title
		}
		if req.Status != nil {
			if !slices.Contains(taskStatuses, *req.Status) {
				return t, errInvalidStatus
			}
			t.Status = *req.Status
		}
		return t, nil
	})

	switch {
	case !found || errors.Is(err, errNotOwner):
		writeError(w, http.StatusNotFound, "task not found")
	case err != nil:
		writeError(w, http.StatusBadRequest, err.Error())
	default:
		writeJSON(w, http.StatusOK, dataResponse{Data: updated})
	}
}

func (s *taskStore) handleDelete(w http.ResponseWriter, r *http.Request) {
	t, ok := s.find(r)
	if !ok {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	s.tasks.Delete(t.ID)
	w.WriteHeader(http.StatusNoContent)
}

var errNotOwner = errors.New("task belongs to another user")

func (s *taskStore) find(r *http.Request) (task, bool) {
	id, ok := taskID(r)
	if !ok {
		return task{}, false
	}
	t, ok := s.tasks.Get(id)
	if !ok || t.owner != ownerFrom(r) {
		return task{}, false
	}
	return t, true
}

func taskID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil && id > 0
}
