package main

import (
	"Niyantran/handlers"
	"database/sql"
	"fmt"
	"log"
	"os"
)

func InitDB() *handlers.Handler{

	connStr := fmt.Sprintf(
	"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
	os.Getenv("DB_HOST"),
	os.Getenv("DB_PORT"),
	os.Getenv("DB_USER"),
	os.Getenv("DB_PASSWORD"),
	os.Getenv("DB_NAME"),
)

	var err error
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Connected to db")

	return &handlers.Handler{
		DB: db,
	}
}