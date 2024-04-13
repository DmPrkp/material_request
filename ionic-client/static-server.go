package main

import (
	"log"
	"net/http"
)

func main() {
	fs := http.FileServer(http.Dir("./build"))
	http.Handle("/", fs)

	log.Print("Listening on :5173...")
	err := http.ListenAndServe(":5173", nil)
	if err != nil {
		log.Fatal(err)
	}
}