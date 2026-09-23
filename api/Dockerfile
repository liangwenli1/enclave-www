# 云端 API（Go）。两段：编译 → 只带一个静态二进制运行。
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/enclave-api ./cmd/server

FROM alpine:3.22
RUN adduser -D -u 10001 enclave && mkdir -p /data /etc/enclave && chown enclave /data
COPY --from=build /out/enclave-api /usr/local/bin/enclave-api
USER enclave
EXPOSE 3012
VOLUME ["/data"]
ENTRYPOINT ["enclave-api", "-config", "/etc/enclave/config.yaml"]
