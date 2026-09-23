// Enclave 云端 API：账号、订阅、设备绑定、许可证签发、内核上架。
package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"enclave/api/internal/config"
	"enclave/api/internal/httpapi"
	"enclave/api/internal/license"
	"enclave/api/internal/secret"
	"enclave/api/internal/store"

	"github.com/redis/go-redis/v9"
)

func main() {
	path := flag.String("config", "/etc/enclave/config.yaml", "配置文件")
	flag.Parse()

	cfg, err := config.Load(*path)
	if err != nil {
		log.Fatal(err)
	}
	key, _ := cfg.MasterKeyBytes()
	box, err := secret.New(key)
	if err != nil {
		log.Fatal(err)
	}
	signer, err := license.LoadOrCreate(cfg.DataDir)
	if err != nil {
		log.Fatalf("签名私钥：%v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: cfg.Redis.Addr, Password: cfg.Redis.Password, DB: cfg.Redis.DB})
	st, err := store.Open(cfg.DSN(), rdb)
	if err != nil {
		log.Fatalf("数据库：%v", err)
	}
	log.Printf("license public key: %s", signer.PublicKey())

	srv := &http.Server{
		Addr: cfg.Listen, Handler: httpapi.New(cfg, st, signer, box),
		ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second,
		WriteTimeout: 60 * time.Second, IdleTimeout: 120 * time.Second,
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()
	go func() {
		log.Printf("listening on %s", cfg.Listen)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	<-ctx.Done()
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdown)
}
