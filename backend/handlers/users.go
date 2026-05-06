package handlers

import (
	"Niyantran/models"
	"Niyantran/utils"
	"encoding/json"
	"net/http"
)

func (h *Handler) CreateUser (w http.ResponseWriter, r *http.Request) {
	var user models.User

	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&user)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	password, err := utils.HashPassword(user.Password)

	_, err = h.DB.Exec(
		"INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
		user.Name, user.Email, password,
	)

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	w.Write([]byte("User created"))
}