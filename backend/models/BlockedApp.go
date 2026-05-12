package models

// BlockedApp represents a single blocked app package for a user
type BlockedApp struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	PackageName string `json:"package_name"`
}

// BlockedAppsRequest represents the payload for saving blocked apps
type BlockedAppsRequest struct {
	Password string   `json:"password"`
	Packages []string `json:"packages"`
}
