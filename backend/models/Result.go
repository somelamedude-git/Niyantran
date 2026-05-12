package models

import "time"

type Result struct {
	ID         int       `json:"id"`
	SNO        int       `json:"sno"`
	UserId     int       `json:"userid"`
	Probabilty float64   `json:"probability"`
	Average    float64   `json:"average"`
	ScreenTime float64   `json:"screentime"`
	Time       time.Time `json:"-"`
}
