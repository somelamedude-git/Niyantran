package main

import (
	"Niyantran/handlers"
	"database/sql"
	"log"
	"os"
)

func InitDB() *handlers.Handler{
	connStr := os.Getenv("CONN_STR")

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