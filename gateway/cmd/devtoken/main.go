// devtoken signs a test token with the development private key.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"ticket-platform/gateway/internal/auth"
)

func main() {
	keyPath := flag.String("key", "dev-keys/private.pem", "RSA private key in PEM format")
	sub := flag.String("sub", "u1", "user id (sub claim)")
	roles := flag.String("roles", "requester", "comma-separated roles")
	ttl := flag.Duration("ttl", 15*time.Minute, "token lifetime; negative gives an expired token")
	iss := flag.String("iss", "ticket-devtoken", "issuer")
	aud := flag.String("aud", "ticket-platform", "audience")
	flag.Parse()

	pemBytes, err := os.ReadFile(*keyPath)
	if err != nil {
		log.Fatal(err)
	}
	key, err := jwt.ParseRSAPrivateKeyFromPEM(pemBytes)
	if err != nil {
		log.Fatal(err)
	}

	now := time.Now()
	claims := auth.Claims{
		Roles: strings.Split(*roles, ","),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   *sub,
			Issuer:    *iss,
			Audience:  jwt.ClaimStrings{*aud},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(*ttl)),
		},
	}

	signed, err := jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(key)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(signed)
}
