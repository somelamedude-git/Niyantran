package handlers

import (
	"Niyantran/utils"
	"database/sql"
)

type Handler struct {
	DB *sql.DB
	Redis *utils.Redis
}