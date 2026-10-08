package load

type Result struct {
	DurationMs float64       `json:"durationMs"`
	TargetRps  int           `json:"targetRps"`
	AvgRps     float64       `json:"avgRps"`
	Routes     []RouteResult `json:"targets"`
}

type RouteResult struct {
	Method        string               `json:"method"`
	URL           string               `json:"url"`
	TotalRequests int                  `json:"totalRequests"`
	SuccessCount  int                  `json:"successCount"`
	ErrorCount    int                  `json:"errorCount"`
	ErrorRate     float64              `json:"errorRate"`
	LateCount     int                  `json:"lateCount"`
	ResponseTime  *Percentiles         `json:"responseTime,omitempty"`
	ServiceTime   *Percentiles         `json:"serviceTime,omitempty"`
	StatusCodes   map[int]int          `json:"statusCodes,omitempty"`
	Errors        map[NetworkError]int `json:"errors,omitempty"`
}
