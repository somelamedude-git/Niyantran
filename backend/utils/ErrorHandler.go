package utils

import "github.com/gin-gonic/gin"

func ErrorHandler (c *gin.Context, code int, message string, err string) {
	c.JSON(code, gin.H {
		"code" : code,
		"message" : message,
		"error" : err,
	})
}