package utils

import "math/rand"

func GenerateRoomCode () string {
	chars := "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
	result := make([]byte, 6)

	for i := range result {
		result[i] = chars[rand.Intn(len(chars))]
	}

	return string(result)
}