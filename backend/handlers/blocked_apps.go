package handlers

import (
	"Niyantran/models"
	"Niyantran/utils"
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetBlockedApps(c *gin.Context) {
	userIdRaw, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId, _ := strconv.Atoi(userIdRaw.(string))

	rows, err := h.DB.Query("SELECT package_name FROM blocked_apps WHERE user_id = $1", userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query blocked apps"})
		return
	}
	defer rows.Close()

	var packages []string
	for rows.Next() {
		var pkg string
		if err := rows.Scan(&pkg); err != nil {
			continue
		}
		packages = append(packages, pkg)
	}

	if packages == nil {
		packages = []string{}
	}

	c.JSON(http.StatusOK, gin.H{
		"packages": packages,
	})
}

func (h *Handler) SaveBlockedApps(c *gin.Context) {
	userIdRaw, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId, _ := strconv.Atoi(userIdRaw.(string))

	var req models.BlockedAppsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	// Verify password
	var hashedPassword string
	err := h.DB.QueryRow("SELECT password FROM users WHERE id = $1", userId).Scan(&hashedPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	if err := utils.CheckPassword(req.Password, hashedPassword); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect password"})
		return
	}

	// Start transaction
	tx, err := h.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

	// Delete existing
	_, err = tx.Exec("DELETE FROM blocked_apps WHERE user_id = $1", userId)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear existing blocked apps"})
		return
	}

	// Insert new
	if len(req.Packages) > 0 {
		stmt, err := tx.Prepare("INSERT INTO blocked_apps (user_id, package_name) VALUES ($1, $2)")
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare insert statement"})
			return
		}
		defer stmt.Close()

		for _, pkg := range req.Packages {
			_, err = stmt.Exec(userId, pkg)
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert blocked app"})
				return
			}
		}
	}

	err = tx.Commit()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Blocked apps saved successfully",
	})
}
