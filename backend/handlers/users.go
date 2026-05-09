package handlers

import (
	"Niyantran/auth"
	"Niyantran/models"
	"Niyantran/utils"
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) CreateUser (c *gin.Context) {
	var user models.User

	if err := c.ShouldBindBodyWithJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H {
			"error" : "Invalid JSON",
		})
		return
	}

	password, err := utils.HashPassword(user.Password)

	_, err = h.DB.Exec(
		"INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
		user.Name, user.Email, password,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {
			"error" : "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H {
		"message" : "user created",
	})
}

func (h *Handler) Login (c *gin.Context) {
	var user models.User

	if err := c.ShouldBindBodyWithJSON(&user); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"Error" : "Invalid JSON"})
		return
	}

	var tbc models.User

	err := h.DB.QueryRow(
		"SELECT id, name, email, password FROM users WHERE email = $1",
		user.Email,
	).Scan(
		&tbc.ID,
		&tbc.Name,
		&tbc.Email,
		&tbc.Password,
	)

	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error" : "user not found"})
		return
	}

	if err := utils.CheckPassword(user.Password, tbc.Password); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"Error" : "Password does'nt match"})
		return
	}

	toks, err := auth.IssueToken(tbc.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error" : "could not issue tokens"})
		return
	}

	ctx := context.Background()

	if err := auth.Persist(ctx, h.Redis, toks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error" : "could not issue tokens"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token" : toks.Access,
		"refresh_token" : toks.Refresh,
		"access_exp" : toks.ExpAcc,
		"refresh_exp" : toks.ExpRef,

		"user" : gin.H {
			"id" : tbc.ID,
			"name" : tbc.Name,
			"email" : tbc.Email,
		},
	})
}

func (h *Handler)Logout (c *gin.Context) {
	type LogoutRequest struct {
		RefreshToken string `json:"refresh_token"`
	}

	var req LogoutRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H {
			"error" : "Invalid JSON",
		})

		return
	}

	access_token := auth.BearerFromHeader(c)

	if access_token == "" {
		c.JSON(http.StatusUnauthorized, gin.H {
			"Error" : "missing access token",
		})
		return
	}

	ctx := context.Background()

	access_claims, err := auth.ParseAccess(access_token)

	if err == nil {

		_ = h.Redis.DelJTI(
			ctx,
			"access:"+access_claims.ID,
		)
	}

	refreshClaims, err := auth.ParseRefresh(req.RefreshToken)

	if err == nil {

		_ = h.Redis.DelJTI(
			ctx,
			"refresh:"+refreshClaims.ID,
		)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "logged out successfully",
	})
}

func (h *Handler) Refresh(c *gin.Context) {

	type RefreshRequest struct {
		RefreshToken string `json:"refresh_token"`
	}

	var req RefreshRequest

	if err := c.ShouldBindJSON(&req); err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid json",
		})

		return
	}

	if req.RefreshToken == "" {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "missing refresh token",
		})

		return
	}
	

	claims, err := auth.ParseRefresh(
		req.RefreshToken,
	)

	if err != nil {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "invalid refresh token",
		})

		return
	}

	ctx := context.Background()

	_, err = h.Redis.GetUserByJTI(
		ctx,
		"refresh:"+claims.ID,
	)

	if err != nil {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "refresh token revoked",
		})

		return
	}

	_ = h.Redis.DelJTI(
		ctx,
		"refresh:"+claims.ID,
	)

	toks, err := auth.IssueToken(
		claims.Subject,
	)

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not issue new tokens",
		})

		return
	}

	err = auth.Persist(
		ctx,
		h.Redis,
		toks,
	)

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not persist new tokens",
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{

		"access_token":  toks.Access,
		"refresh_token": toks.Refresh,

		"access_exp":  toks.ExpAcc,
		"refresh_exp": toks.ExpRef,
	})
}