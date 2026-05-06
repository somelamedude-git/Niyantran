package handlers

import (
	"Niyantran/models"
	"encoding/json"
	"net/http"
)

func (h *Handler) ReceiveModelData(w http.ResponseWriter, r *http.Request) {
	var result models.Result
	
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&result)

	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	
	_, err = h.DB.Exec(
		"INSERT INTO results (userid, probability, time) VALUES ($1, $2, $3)",
		result.UserId, result.Probabilty, result.Time,
	)

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	w.Write([]byte("Result created"))
}