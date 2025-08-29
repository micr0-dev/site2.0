// climate_prefetch.go
// Fetches climate datasets server-side and writes compact JSON series your
// page can load from same-origin (no CORS headaches).
//
// Usage:
//   go run climate_prefetch.go -out ./public/data
//
// It will create:
//   gistemp.json, sealevel.json, co2.json, damages.json, idp.json
// Each file is an array of {"x": number, "y": number} compatible with your renderLine().

package main

import (
	"bufio"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Point matches your JS series shape
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

var client *http.Client

func main() {
	outDir := flag.String("out", "./public/data", "output directory for JSON files")
	timeout := flag.Duration("timeout", 20*time.Second, "HTTP timeout")
	flag.Parse()

	client = &http.Client{Timeout: *timeout}

	if err := os.MkdirAll(*outDir, 0o755); err != nil {
		fatalf("creating out dir: %v", err)
	}

	ctx := context.Background()
	// Fetch all sources
	fmt.Println("Fetching datasets…")

	if pts, err := fetchGISTEMP(ctx); err != nil {
		warn("GISTEMP", err)
	} else if err := writeJSON(filepath.Join(*outDir, "gistemp.json"), pts); err != nil {
		warn("GISTEMP write", err)
	} else {
		fmt.Printf("✔ gistemp.json (%d points)\n", len(pts))
	}

	if pts, err := fetchSeaLevel(ctx); err != nil {
		warn("SeaLevel", err)
	} else if err := writeJSON(filepath.Join(*outDir, "sealevel.json"), pts); err != nil {
		warn("SeaLevel write", err)
	} else {
		fmt.Printf("✔ sealevel.json (%d points)\n", len(pts))
	}

	if pts, err := fetchOWID(ctx, "https://ourworldindata.org/grapher/annual-co2-including-land-use.csv", "World"); err != nil {
		warn("CO2", err)
	} else if err := writeJSON(filepath.Join(*outDir, "co2.json"), pts); err != nil {
		warn("CO2 write", err)
	} else {
		fmt.Printf("✔ co2.json (%d points)\n", len(pts))
	}

	if pts, err := fetchOWID(ctx, "https://ourworldindata.org/grapher/economic-damage-from-natural-disasters.csv", "World"); err != nil {
		warn("Damages", err)
	} else if err := writeJSON(filepath.Join(*outDir, "damages.json"), pts); err != nil {
		warn("Damages write", err)
	} else {
		fmt.Printf("✔ damages.json (%d points)\n", len(pts))
	}

	if pts, err := fetchOWID(ctx, "https://ourworldindata.org/grapher/internally-displaced-persons-from-disasters.csv", "World"); err != nil {
		warn("IDP", err)
	} else if err := writeJSON(filepath.Join(*outDir, "idp.json"), pts); err != nil {
		warn("IDP write", err)
	} else {
		fmt.Printf("✔ idp.json (%d points)\n", len(pts))
	}

	fmt.Println("Done. Serve /public as your site root and fetch from /data/*.json")
}

func fetch(ctx context.Context, url string) (io.ReadCloser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "climate-prefetch/1.0 (+https://example)")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		defer resp.Body.Close()
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	return resp.Body, nil
}

// ---------------- NASA GISTEMP ----------------
// Source: tabledata_v4/ZonAnn.Ts+dSST.txt
// Lines starting with Year, columns: Year Glob NHem SHem ...
// Glob is hundredths of °C relative to 1951–1980 baseline -> multiply 0.01
func fetchGISTEMP(ctx context.Context) ([]Point, error) {
	rc, err := fetch(ctx, "https://data.giss.nasa.gov/gistemp//tabledata_v4/ZonAnn.Ts%2BdSST.txt")
	if err != nil {
		return nil, err
	}
	defer rc.Close()

	s := bufio.NewScanner(rc)
	yearRe := regexp.MustCompile(`^\s*\d{4}`)
	pts := make([]Point, 0, 200)
	for s.Scan() {
		line := s.Text()
		if !yearRe.MatchString(line) {
			continue
		}
		fields := splitWS(line)
		if len(fields) < 2 {
			continue
		}
		year, err1 := strconv.Atoi(fields[0])
		globHund, err2 := strconv.ParseFloat(fields[1], 64)
		if err1 != nil || err2 != nil {
			continue
		}
		if year < 1880 { // mirror your JS filter
			continue
		}
		pts = append(pts, Point{X: float64(year), Y: globHund * 0.01})
	}
	if err := s.Err(); err != nil {
		return nil, err
	}
	if len(pts) == 0 {
		return nil, errors.New("no GISTEMP points parsed")
	}
	return pts, nil
}

// ---------------- NASA/JPL Sea Level ----------------
// Source text columns; want col 3 (year.frac), col 12 (smoothed GIA, seasonal removed, mm)
func fetchSeaLevel(ctx context.Context) ([]Point, error) {
	rc, err := fetch(ctx, "https://climate.nasa.gov/system/internal_resources/details/original/121_Global_Sea_Level_Data_File.txt")
	if err != nil {
		return nil, err
	}
	defer rc.Close()

	s := bufio.NewScanner(rc)
	pts := make([]Point, 0, 1000)
	for s.Scan() {
		line := strings.TrimSpace(s.Text())
		if line == "" || strings.HasPrefix(line, "HDR") { // skip header rows
			continue
		}
		fields := splitWS(line)
		if len(fields) < 12 { // need at least 12 columns
			continue
		}
		yearFrac, err1 := strconv.ParseFloat(fields[2], 64)
		gmsl, err2 := strconv.ParseFloat(fields[11], 64)
		if err1 != nil || err2 != nil {
			continue
		}
		if !isFinite(yearFrac) || !isFinite(gmsl) || abs(gmsl) >= 9e4 {
			continue
		}
		pts = append(pts, Point{X: yearFrac, Y: gmsl})
	}
	if err := s.Err(); err != nil {
		return nil, err
	}
	if len(pts) == 0 {
		return nil, errors.New("no Sea Level points parsed")
	}
	return pts, nil
}

// ---------------- Our World In Data generic CSV fetcher ----------------
// Assumes columns include Entity, Year, and a numeric value column. Uses last column as value
// (matching your existing JS). Filters to the provided entity (e.g., "World").
func fetchOWID(ctx context.Context, url, entity string) ([]Point, error) {
	rc, err := fetch(ctx, url)
	if err != nil {
		return nil, err
	}
	defer rc.Close()

	csvr := csv.NewReader(rc)
	csvr.FieldsPerRecord = -1 // variable-width safe
	head, err := csvr.Read()
	if err != nil {
		return nil, err
	}
	idxEntity := indexOf(head, "Entity")
	idxYear := indexOf(head, "Year")
	if idxEntity == -1 || idxYear == -1 {
		return nil, fmt.Errorf("missing Entity/Year in header: %v", head)
	}

	pts := make([]Point, 0, 300)
	for {
		row, err := csvr.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, err
		}
		if row[idxEntity] != entity {
			continue
		}
		year, err1 := strconv.Atoi(row[idxYear])
		if err1 != nil {
			continue
		}
		valStr := row[len(row)-1]
		if valStr == "" {
			continue
		}
		val, err2 := strconv.ParseFloat(valStr, 64)
		if err2 != nil || !isFinite(val) {
			continue
		}
		pts = append(pts, Point{X: float64(year), Y: val})
	}
	if len(pts) == 0 {
		return nil, fmt.Errorf("no points parsed from %s", url)
	}
	return pts, nil
}

// ---------------- utils ----------------
func writeJSON(path string, v any) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	enc.SetIndent("", " ")
	return enc.Encode(v)
}

func indexOf(ss []string, want string) int {
	for i, s := range ss {
		if s == want {
			return i
		}
	}
	return -1
}

func splitWS(s string) []string { return strings.Fields(s) }

func isFinite(f float64) bool { return !((f != f) || (f > 1e308) || (f < -1e308)) }
func abs(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}

func warn(what string, err error)    { fmt.Fprintf(os.Stderr, "! %s: %v\n", what, err) }
func fatalf(format string, a ...any) { fmt.Fprintf(os.Stderr, format+"\n", a...); os.Exit(1) }
