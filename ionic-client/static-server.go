package main

import (
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./build/index.html")
	})


	log.Print("Listening on :5173...")
	err := http.ListenAndServe(":5173", nil)
	if err != nil {
		log.Fatal(err)
	}
}