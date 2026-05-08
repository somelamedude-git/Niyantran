package main

import (
	"Niyantran/handlers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Temporarily ignore .env and DB errors so the upload server can run!
	godotenv.Load()

	// h := InitDB()

	r := gin.Default()
	r.MaxMultipartMemory = 10 << 20

	// r.POST("/user/results/create", h.ReceiveModelData)
	r.POST("/uploads", handlers.UploadFilesHandlers)

	r.Run(":8000")
}