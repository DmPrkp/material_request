package main

import (
	"net/http"
	"os"
)

func main() {
	fs := http.FileServer(http.Dir("./dist"))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		_, err := os.Stat("./dist" + r.URL.Path)

		if os.IsNotExist(err) {
			http.ServeFile(w, r, "./dist/index.html")
			return
		}

		fs.ServeHTTP(w, r)
	})

	http.ListenAndServe(":5173", nil)
}