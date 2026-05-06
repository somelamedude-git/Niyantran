package models

import "time"

type Result struct {
	ID string `json:"id"`
	UserId int `json:"userid"`
	Probabilty float64 `json:"probability"`
	Time time.Time `json:"datetime"`
}