package handlers

import (
	"Niyantran/models"
	"Niyantran/utils"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler) CreateRoom(c *gin.Context) {
	type Request struct {
		Room_name string `json:"room_name"`
	}
	var req Request

	if err := c.ShouldBindBodyWithJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request",
		})
		return
	}

	userID := c.MustGet("userID").(string)

	parsedUserId, err := strconv.Atoi(userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {
			"error" : "Internal server error",
		})
		return
	}

	roomCode := utils.GenerateRoomCode()

	room := models.Room{
		Room_name:  req.Room_name,
		Room_code:  roomCode,
		Created_by: parsedUserId,
		Created_at: time.Now(),
	}

	var roomID int

	err = h.DB.QueryRow(
	`INSERT INTO rooms 
	(room_code, room_name, created_by, created_at) 
	VALUES ($1, $2, $3, $4)
	RETURNING id`,
	room.Room_code,
	room.Room_name,
	room.Created_by,
	room.Created_at,
	).Scan(&roomID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	_, err = h.DB.Exec(
		`INSERT INTO membership
		(room_id, user_id, joined_at)
		VALUES ($1, $2, $3)`,
		roomID, parsedUserId, room.Created_at,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "room created",
		"room":    room,
	})
}

func (h *Handler) JoinRoom(c *gin.Context) {
	type Request struct {
		RoomCode string `json:"room_code"`
	}

	var req Request

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}

	if req.RoomCode == "" {
		c.JSON(400, gin.H{
			"error": "room code required",
		})
		return
	}

	var room models.Room

	err := h.DB.QueryRow(
		`SELECT id, room_code, room_name, created_by, created_at
		FROM rooms
		WHERE room_code = $1`,
		req.RoomCode,
	).Scan(
		&room.Id,
		&room.Room_code,
		&room.Room_name,
		&room.Created_by,
		&room.Created_at,
	)

	if err != nil {
		c.JSON(404, gin.H{"error": "room not found"})
		return
	}

	userID := c.MustGet("userID").(string)

	parsedUserId, err := strconv.Atoi(userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {
			"error" : "Internal server error",
		})
		return
	}

	member := models.Membership{
		Room_id:   room.Id,
		User_id:   parsedUserId,
		Joined_at: time.Now(),
	}

	_, err = h.DB.Exec(
		"INSERT INTO membership (room_id, user_id, joined_at) VALUES ($1, $2, $3)",
		member.Room_id,
		member.User_id,
		member.Joined_at,
	)

	if err != nil {

		if strings.Contains(err.Error(), "unique_room_user") {
			c.JSON(400, gin.H{
				"error": "already joined room",
			})
			return
		}

		c.JSON(500, gin.H{
			"error": "failed to join room",
		})
		return
	}

	c.JSON(200, gin.H{
		"message": "joined room",
	})
}

func (h *Handler) GetLeaderboard(c *gin.Context) {

	code := c.Param("code")

	type Result struct {
		Name        string  `json:"name"`
		Email       string  `json:"email"`
		Probability float64 `json:"probability"`
	}

	var results []Result

	query := `
    SELECT *
    FROM (
        SELECT DISTINCT ON (users.id)
            users.name,
            users.email,
            results.probability
        FROM membership
        JOIN users ON users.id = membership.user_id
        JOIN results ON results.userid = users.id
        JOIN rooms ON rooms.id = membership.room_id
        WHERE rooms.room_code = $1
        ORDER BY users.id, results.time DESC
    ) latest_results
    ORDER BY probability DESC;
    `

	rows, err := h.DB.Query(query, code)
	if err != nil {
		c.JSON(500, gin.H{
			"error": err.Error(),
		})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var result Result

		err := rows.Scan(
			&result.Name,
			&result.Email,
			&result.Probability,
		)

		if err != nil {
			c.JSON(500, gin.H{
				"error": err.Error(),
			})
			return
		}

		results = append(results, result)
	}

	c.JSON(200, gin.H{
		"leaderboard": results,
	})
}