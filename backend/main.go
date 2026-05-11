package main

import (
	"Niyantran/auth"
	"Niyantran/handlers"
	"Niyantran/utils"
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

func main() {

	db := InitDB()
	redisClient := utils.NewRedis()

	h := &handlers.Handler{
		DB: db,
		Redis: redisClient,
	}

	r := gin.Default()
	r.MaxMultipartMemory = 10 << 20

	r.POST("/user/results/create", h.ReceiveModelData)
	r.POST("/uploads", auth.AuthMiddleware(redisClient),h.UploadInfo)
	r.POST("/login", h.Login)
	r.POST("/users/create", h.CreateUser)
	r.POST("/logout", auth.AuthMiddleware(redisClient),h.Logout)
	r.POST("/refresh", h.Refresh)
	r.POST("/room/create", auth.AuthMiddleware(redisClient),h.CreateRoom)
	r.POST("/room/join", auth.AuthMiddleware(redisClient),h.JoinRoom)
	r.GET("/room/leaderboard/:code", auth.AuthMiddleware(redisClient),h.GetLeaderboard)

	r.Run(":8000")
}