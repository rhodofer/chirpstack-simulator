# 1. Aşama: Go kodunu derleme (Builder Stage)
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git make bash

WORKDIR /app

# Go mod bağımlılıklarını önbelleğe alma
COPY go.mod go.sum ./
RUN go mod download

# Tüm kaynak kodları kopyala ve derle
COPY . .
RUN CGO_ENABLED=0 go build -ldflags "-s -w" -o chirpstack-simulator cmd/chirpstack-simulator/main.go

# 2. Aşama: Hafif Çalışma Ortamı (Runner Stage)
FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Derlenen binary'yi builder aşamasından kopyala
COPY --from=builder /app/chirpstack-simulator /app/chirpstack-simulator

# Varsayılan başlangıç komutu
ENTRYPOINT ["/app/chirpstack-simulator"]
