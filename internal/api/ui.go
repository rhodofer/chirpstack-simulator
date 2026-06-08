package api

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed frontend/*
var frontendFiles embed.FS

// uiHandler returns an http.Handler that serves the embedded frontend files.
// The frontend/ directory must exist next to this Go file (internal/api/frontend/).
func uiHandler() http.Handler {
	fsys, err := fs.Sub(frontendFiles, "frontend")
	if err != nil {
		// This should never happen if the embed is correct.
		return http.NotFoundHandler()
	}
	return http.FileServer(http.FS(fsys))
}
