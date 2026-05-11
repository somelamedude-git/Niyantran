package handlers

import (
	"Niyantran/utils"
	"fmt"
	"github.com/gin-gonic/gin"
)

func (h *Handler) ReceiveModelData(c *gin.Context) {
	type Request struct {
		Id int `json:"id"`
		Probability float64 `json:"probability"`
	}

	var result Request

	if err := c.ShouldBindBodyWithJSON(&result); err != nil {
		utils.ErrorHandler(c, 400, "Bad Request", fmt.Sprintf("%v", err))
		return
	}

	var query = `
	UPDATE results
	SET probability = $1
	WHERE id = $2
	`
	
	_, err := h.DB.Exec(
		query,
		result.Probability,
		result.Id,
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