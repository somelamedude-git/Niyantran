package main

import (
	"Niyantran/handlers"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env")
	}

	h := InitDB()

	r := gin.Default()
	r.MaxMultipartMemory = 10 << 20

	r.POST("/user/results/create", h.ReceiveModelData)
	r.POST("/uploads", handlers.UploadFilesHandlers)

	r.Run(":8000")
}