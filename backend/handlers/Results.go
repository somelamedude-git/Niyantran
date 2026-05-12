package handlers

import (
	"Niyantran/utils"
	"fmt"
	"net/http"
	"strconv"

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

func (h *Handler) RetreiveResults(c *gin.Context){
	userID := c.MustGet("userID").(string)

	parsedUserId, err := strconv.Atoi(userID)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{ 
			"error" : "bad gateway",
		})
		return
	}

	var query = `
	SELECT probability
	FROM results
	WHERE userid = $1
	ORDER BY time DESC
	LIMIT 1
	`

	var probability float64

	if err := h.DB.QueryRow(
		query,
		parsedUserId,
	).Scan(&probability); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {
			"error" : "internal server error",
		})

		return
	}

	c.JSON(http.StatusOK, gin.H {
		"probability" : probability,
	})
}