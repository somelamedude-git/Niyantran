package handlers

import (
	"Niyantran/utils"
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler)UploadInfo(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		if err.Error() == "http: request body too large" {
			utils.ErrorHandler(c, 413, "File too large", fmt.Sprintf("%v", err))
			return
		}
		utils.ErrorHandler(c, 400, "Bad Request", fmt.Sprintf("%v", err))
		return
	}
	defer file.Close()

	screentime := c.PostForm("screentime")

	userID := c.MustGet("userID").(string)

	parsedUserId, err := strconv.Atoi(userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {
			"error" : "Internal server error",
			"msg" : err.Error(),
		})
		return
	}

	var query =  `
		INSERT INTO results (userid, screentime, time) 
		VALUES ($1, $2, $3)
		RETURNING id
	`

	var resultID int

	err = h.DB.QueryRow(
		query,
		parsedUserId,
		screentime,
		time.Now(),
	).Scan(&resultID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error" : "Internal server error",
			"msg" : err.Error(),
		})
		return
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	t := time.Now()
	str := t.Format("2006-01-02 15:04:05")
	part, err := writer.CreateFormFile("file", str+" -- "+header.Filename)
	if err != nil {
		utils.ErrorHandler(c, 500, "Internal server error", fmt.Sprintf("%v", err))
		return
	}

	_, err = io.Copy(part, file)
	if err != nil {
		utils.ErrorHandler(c, 500, "Internal server error", fmt.Sprintf("%v", err))
		return
	}

	err = writer.WriteField("resultid", strconv.Itoa(resultID))
	if err != nil {
		return
	}

	writer.Close()

	req, err := http.NewRequest("POST", "route", &body)
	if err != nil {
		utils.ErrorHandler(c, 500, "Internal server error", fmt.Sprintf("%v", err))
		return
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		utils.ErrorHandler(c, 500, "Internal server error", fmt.Sprintf("%v", err))
		return
	}

	defer resp.Body.Close()

	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		utils.ErrorHandler(c, 500, "Internal server error", fmt.Sprintf("%v", err))
		return
	}

	c.JSON(200, gin.H{
		"code": 200,
		"info": string(respData),
	})
	c.Abort()
}
