#!/usr/bin/env bash
# 第一次部署用：生成 config.yaml（带随机主密钥）和数据库密码文件。已经有的不会覆盖。
# 用法：./scripts/init-config.sh https://你的域名 you@example.com
set -euo pipefail
cd "$(dirname "$0")/.."
url="${1:-http://127.0.0.1:3011}"
admin="${2:-you@example.com}"

mkdir -p secrets
if [ ! -f secrets/postgres_password ]; then
  ( umask 077; openssl rand -hex 24 > secrets/postgres_password )
  echo "已生成 secrets/postgres_password"
fi
if [ ! -f config.yaml ]; then
  key="$(openssl rand -base64 32)"
  ( umask 077
    sed -e "s#^public_url: .*#public_url: \"$url\"#" \
        -e "s#^master_key: .*#master_key: \"$key\"#" \
        -e "s#\"you@example.com\"#\"$admin\"#" config.example.yaml > config.yaml )
  echo "已生成 config.yaml（管理员：$admin，地址：$url）"
  echo "主密钥在 config.yaml 里，备份好它：丢了，管理后台里填过的支付密钥要重填。"
fi
# 容器里的服务不是 root，要读得到这两个文件。
chmod 644 config.yaml secrets/postgres_password
