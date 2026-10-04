package template

import (
	crand "crypto/rand"
	"fmt"
	"math/rand/v2"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var placeholderRe = regexp.MustCompile(`\{\{\$?\w+\}\}`)

func Resolve(s string) string {
	return ResolveWithVars(s, nil)
}

func ResolveWithVars(s string, vars map[string]string) string {
	return placeholderRe.ReplaceAllStringFunc(s, func(match string) string {
		name := match[2 : len(match)-2]

		if generatorName, isGenerator := strings.CutPrefix(name, "$"); isGenerator {
			if v, ok := generate(generatorName); ok {
				return v
			}
			return match
		}

		if v, ok := vars[name]; ok {
			return v
		}

		return match
	})
}

func generate(name string) (string, bool) {
	switch name {
	case "uuid":
		return newUUID(), true
	case "randomInt":
		return strconv.Itoa(rand.IntN(1_000_000)), true
	case "randomEmail":
		return "user_" + strconv.FormatUint(rand.Uint64(), 36) + "@example.com", true
	case "timestamp":
		return strconv.FormatInt(time.Now().Unix(), 10), true
	default:
		return "", false
	}
}

func newUUID() string {
	var b [16]byte
	crand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
