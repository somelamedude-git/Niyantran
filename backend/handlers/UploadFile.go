package handlers

/*
=============================================================================
FUTURE USE: PROXY UPLOAD LOGIC
=============================================================================
The following code was originally used to forward/proxy the uploaded file 
to an external API endpoint (placeholder "route"). It has been commented out 
for now while we test local file saving, but kept here for future use.

func UploadFilesHandlers_Legacy(c *gin.Context) {
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

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	t := time.Now()
	str := t.Format("2006-01-02 15:04:05")
	part, err := writer.CreateFormFile("file", str + " -- " + header.Filename)
	if err != nil {
		utils.ErrorHandler(c, 500, "Internal server error", fmt.Sprintf("%v", err))
		return
	}

	_, err = io.Copy(part, file)
	if err != nil {
		utils.ErrorHandler(c, 500, "Internal server error", fmt.Sprintf("%v", err))
		return
	}

	writer.Close()

	// "route" is a placeholder URL for the external API
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
		"code" : 200,
		"info" : string(respData), 
	})
	c.Abort()
}
=============================================================================
*/

import (
	"Niyantran/utils"
	"fmt"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

func UploadFilesHandlers(c *gin.Context) {

	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorHandler(c, 400, "Bad Request", fmt.Sprintf("Missing file: %v", err))
		return
	}

	// Create a unique filename using the current timestamp
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := filepath.Base(file.Filename)
	savePath := "uploads/" + timestamp + "_" + filename

	// Save the uploaded video locally
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		utils.ErrorHandler(c, 500, "Internal server error", fmt.Sprintf("Could not save file: %v", err))
		return
	}

	c.JSON(200, gin.H{
		"code": 200,
		"info": "Video successfully saved to " + savePath,
	})
}