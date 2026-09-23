// Package config 读启动必需的配置。只读 config.yaml，不读环境变量：
// 密钥放在文件里，能控制谁读得到；环境变量会被子进程继承、被诊断信息带出去。
// 支付通道的密钥不在这里——那些由管理员在管理后台里填，加密后存数据库。
package config

import (
	"encoding/base64"
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Listen string `yaml:"listen"`
	// 官网对外的地址，例如 https://enclave.example。支付完成后跳回来要用。
	PublicURL string `yaml:"public_url"`
	// 放许可证签名私钥的目录。
	DataDir string `yaml:"data_dir"`
	// 32 字节，base64。数据库里的密钥（支付通道的 key 等）用它加密。丢了它，那些密钥要重新填。
	MasterKey string `yaml:"master_key"`
	// 这些邮箱的账号是管理员。账号本身照常注册。
	AdminEmails []string `yaml:"admin_emails"`
	Database    struct {
		Host     string `yaml:"host"`
		Port     int    `yaml:"port"`
		Name     string `yaml:"name"`
		User     string `yaml:"user"`
		Password string `yaml:"password"`
		// 密码也可以放在一个单独的文件里（和 postgres 容器共用同一个文件）。
		PasswordFile string `yaml:"password_file"`
	} `yaml:"database"`
	Redis struct {
		Addr     string `yaml:"addr"`
		Password string `yaml:"password"`
		DB       int    `yaml:"db"`
	} `yaml:"redis"`
}

func Load(path string) (*Config, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("读不到配置文件 %s：%w（从 config.example.yaml 复制一份）", path, err)
	}
	c := &Config{Listen: ":3012", DataDir: "/data"}
	if err := yaml.Unmarshal(raw, c); err != nil {
		return nil, fmt.Errorf("config.yaml 格式不对：%w", err)
	}
	if c.Database.PasswordFile != "" {
		b, err := os.ReadFile(c.Database.PasswordFile)
		if err != nil {
			return nil, fmt.Errorf("读不到数据库密码文件：%w", err)
		}
		c.Database.Password = strings.TrimSpace(string(b))
	}
	if key, err := c.MasterKeyBytes(); err != nil || len(key) != 32 {
		return nil, fmt.Errorf("master_key 要填 32 字节的 base64（生成：openssl rand -base64 32）")
	}
	for i, e := range c.AdminEmails {
		c.AdminEmails[i] = strings.ToLower(strings.TrimSpace(e))
	}
	c.PublicURL = strings.TrimRight(c.PublicURL, "/")
	return c, nil
}

func (c *Config) MasterKeyBytes() ([]byte, error) {
	return base64.StdEncoding.DecodeString(strings.TrimSpace(c.MasterKey))
}

func (c *Config) DSN() string {
	d := c.Database
	return fmt.Sprintf("host=%s port=%d dbname=%s user=%s password=%s sslmode=disable TimeZone=UTC",
		d.Host, d.Port, d.Name, d.User, d.Password)
}

func (c *Config) IsAdmin(email string) bool {
	for _, e := range c.AdminEmails {
		if e == strings.ToLower(email) {
			return true
		}
	}
	return false
}
