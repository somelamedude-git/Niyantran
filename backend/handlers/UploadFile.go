package handlers

import (
	"io"
	"net/http"
	"os"
	"time"
)


func UploadFilesHandlers(w http.ResponseWriter, r *http.Request) {

	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error raeding file", http.StatusBadRequest)
		return
	}

	defer file.Close()

	err = os.MkdirAll("./uploads", os.ModePerm)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	t := time.Now()

	str := t.Format("2006-01-02 15:04:05")

	dst, err := os.Create("./uploads/" + str + "--" + handler.Filename)

	if err != nil {
		http.Error(w, "cannot save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	io.Copy(dst, file)
}