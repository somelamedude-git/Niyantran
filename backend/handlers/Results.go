package handlers

import (
	"Niyantran/models"
	"Niyantran/utils"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ReceiveModelData(c *gin.Context) {
	var result models.Result

	if err := c.BindJSON(&result); err != nil {
		utils.ErrorHandler(c, 400, "Bad Request", fmt.Sprintf("%v", err))
		return
	}

	result.Time = time.Now()
	
	_, err := h.DB.Exec(
		"INSERT INTO results (userid, probability, time) VALUES ($1, $2, $3)",
		result.UserId, result.Probabilty, result.Time,
	)

	if err != nil {
		utils.ErrorHandler(c, 500, "Internal server error", fmt.Sprintf("%v", err))
		return
	}

	c.JSON(200, gin.H {
		"code" : 200,
		"Message" : "Result created",
	})
}