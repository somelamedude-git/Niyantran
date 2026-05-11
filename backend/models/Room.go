package models

import "time"

type Room struct {
	Id int `json:"id"`
	Room_code string `json:"room_code"`
	Room_name string `json:"room_name"`
	Created_by int `json:"created_by"`
	Created_at time.Time `json:"created_at"`
}

type Membership struct {
	Id int `json:"id"`
	Room_id int `json:"room_id"`
	User_id int `json:"user_id"`
	Joined_at time.Time `json:"joined_at"`
}