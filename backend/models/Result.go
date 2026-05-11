package models

import "time"

type Result struct {
	ID int `json:"id"`
	UserId int `json:"userid"`
	Probabilty float64 `json:"probability"`
	ScreenTime int `json:"screentime"`
	Time time.Time `json:"-"`
}