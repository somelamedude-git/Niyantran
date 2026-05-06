package main

import (
	"Niyantran/handlers"
	"net/http"
)

func main() {
	http.HandleFunc("/uploads", handlers.UploadFilesHandlers)
	http.ListenAndServe(":8000", nil)
}