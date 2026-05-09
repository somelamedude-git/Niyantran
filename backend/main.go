package main

import (
	"Niyantran/auth"
	"Niyantran/handlers"
	"Niyantran/utils"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()

	db := InitDB()
	redisClient := utils.NewRedis()

	h := &handlers.Handler{
		DB: db,
		Redis: redisClient,
	}

	r := gin.Default()
	r.MaxMultipartMemory = 10 << 20

	r.POST("/user/results/create", auth.AuthMiddleware(redisClient),h.ReceiveModelData)
	r.POST("/uploads", auth.AuthMiddleware(redisClient),handlers.UploadFilesHandlers)
	r.POST("/login", h.Login)
	r.POST("/users/create", h.CreateUser)
	r.POST("/logout", auth.AuthMiddleware(redisClient),h.Logout)
	r.POST("/refresh", h.Refresh)

	r.Run(":8000")
}