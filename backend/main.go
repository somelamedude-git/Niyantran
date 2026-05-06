package main

import (
	"Niyantran/handlers"
	"log"
	"net/http"
	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env")
	}

	h := InitDB()

	http.HandleFunc("/user/create", h.CreateUser)
	
	http.HandleFunc("/uploads", handlers.UploadFilesHandlers)
	err = http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal(err)
	}
}