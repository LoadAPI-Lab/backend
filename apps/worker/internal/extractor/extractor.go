package extractor

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

var errInvalidJSON = errors.New("response is not valid JSON")

func Extract(body []byte, path string) (string, error) {
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()

	var node any
	if err := decoder.Decode(&node); err != nil {
		return "", errInvalidJSON
	}

	for _, segment := range strings.Split(path, ".") {
		switch current := node.(type) {
		case map[string]any:
			v, ok := current[segment]
			if !ok {
				return "", fmt.Errorf("path %q: field %q not found", path, segment)
			}
			node = v
		case []any:
			index, err := strconv.Atoi(segment)
			if err != nil || index < 0 || index >= len(current) {
				return "", fmt.Errorf("path %q: invalid array index %q", path, segment)
			}
			node = current[index]
		default:
			return "", fmt.Errorf("path %q: cannot go into %q, value is not an object or array", path, segment)

		}
	}

	switch value := node.(type) {
	case string:
		return value, nil
	case json.Number:
		return value.String(), nil
	case bool:
		return strconv.FormatBool(value), nil
	default:
		return "", fmt.Errorf("path %q: value is not a string, number or boolean", path)
	}
}
