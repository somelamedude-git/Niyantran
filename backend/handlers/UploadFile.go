package handlers

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
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

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	t := time.Now()
	str := t.Format("2006-01-02 15:04:05")
	part, err := writer.CreateFormFile("file", str + " -- " + handler.Filename)
	if err != nil {
		http.Error(w, "Error creating form file", http.StatusInternalServerError)
		return
	}

	_, er := io.Copy(part, file)
	if er != nil {
		http.Error(w, "Error copying file", http.StatusInternalServerError)
		return
	}

	writer.Close()

	req, err := http.NewRequest("POST", "route", &body)
	if err != nil {
		http.Error(w, "Error creatig request", http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		http.Error(w, "Error forwarding file", http.StatusInternalServerError)
		return
	}

	defer resp.Body.Close()

	io.Copy(w, resp.Body)
}