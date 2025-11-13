#!/bin/bash

# ============================================
# Sky Chat 部署前检查脚本
# ============================================

set -e

echo "🔍 Sky Chat 部署前检查"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数
ERRORS=0
WARNINGS=0

# 检查函数
check_env_var() {
  local var_name=$1
  local is_required=$2
  
  if [ -z "${!var_name}" ]; then
    if [ "$is_required" = "true" ]; then
      echo -e "${RED}❌ 缺少必需环境变量: $var_name${NC}"
      ((ERRORS++))
    else
      echo -e "${YELLOW}⚠️  可选环境变量未设置: $var_name${NC}"
      ((WARNINGS++))
    fi
  else
    echo -e "${GREEN}✅ $var_name${NC}"
  fi
}

# 1. 检查 Node.js 版本
echo "📦 检查 Node.js 版本..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}❌ Node.js 版本过低: $(node -v) (需要 >= 20)${NC}"
  ((ERRORS++))
else
  echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"
fi
echo ""

# 2. 检查环境变量
echo "🔐 检查环境变量..."

# 加载 .env.production (如果存在)
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
  echo -e "${GREEN}✅ 已加载 .env.production${NC}"
else
  echo -e "${YELLOW}⚠️  .env.production 不存在，使用系统环境变量${NC}"
  ((WARNINGS++))
fi

# 必需的环境变量
check_env_var "DATABASE_URL" "true"
check_env_var "NEXTAUTH_SECRET" "true"
check_env_var "NEXTAUTH_URL" "true"
check_env_var "SILICONFLOW_API_KEY" "true"

# 可选的环境变量
check_env_var "GOOGLE_CLIENT_ID" "false"
check_env_var "GOOGLE_CLIENT_SECRET" "false"
check_env_var "GITHUB_CLIENT_ID" "false"
check_env_var "GITHUB_CLIENT_SECRET" "false"

echo ""

# 3. 检查 NEXTAUTH_SECRET 强度
echo "🔒 检查密钥强度..."
if [ -n "$NEXTAUTH_SECRET" ]; then
  SECRET_LENGTH=${#NEXTAUTH_SECRET}
  if [ "$SECRET_LENGTH" -lt 32 ]; then
    echo -e "${RED}❌ NEXTAUTH_SECRET 太短: $SECRET_LENGTH 字符 (建议 >= 32)${NC}"
    ((ERRORS++))
  else
    echo -e "${GREEN}✅ NEXTAUTH_SECRET 长度: $SECRET_LENGTH 字符${NC}"
  fi
fi
echo ""

# 4. 检查数据库连接
echo "🗄️  检查数据库连接..."
if [ -n "$DATABASE_URL" ]; then
  # 尝试连接数据库（需要 psql）
  if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
      echo -e "${GREEN}✅ 数据库连接成功${NC}"
    else
      echo -e "${RED}❌ 数据库连接失败${NC}"
      ((ERRORS++))
    fi
  else
    echo -e "${YELLOW}⚠️  psql 未安装，跳过数据库连接测试${NC}"
    ((WARNINGS++))
  fi
fi
echo ""

# 5. 检查依赖
echo "📚 检查依赖..."
if [ ! -d "node_modules" ]; then
  echo -e "${RED}❌ node_modules 不存在，请运行: pnpm install${NC}"
  ((ERRORS++))
else
  echo -e "${GREEN}✅ node_modules 存在${NC}"
fi
echo ""

# 6. 检查 Prisma
echo "🔧 检查 Prisma..."
if [ ! -d "node_modules/.prisma" ]; then
  echo -e "${YELLOW}⚠️  Prisma Client 未生成，请运行: pnpm run db:generate${NC}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✅ Prisma Client 已生成${NC}"
fi
echo ""

# 7. 检查构建
echo "🏗️  检查构建..."
if [ ! -d ".next" ]; then
  echo -e "${YELLOW}⚠️  .next 目录不存在，需要运行: pnpm run build${NC}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✅ .next 目录存在${NC}"
fi
echo ""

# 8. 检查 OAuth 配置
echo "🔑 检查 OAuth 配置..."
OAUTH_CONFIGURED=false

if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  echo -e "${GREEN}✅ Google OAuth 已配置${NC}"
  OAUTH_CONFIGURED=true
fi

if [ -n "$GITHUB_CLIENT_ID" ] && [ -n "$GITHUB_CLIENT_SECRET" ]; then
  echo -e "${GREEN}✅ GitHub OAuth 已配置${NC}"
  OAUTH_CONFIGURED=true
fi

if [ "$OAUTH_CONFIGURED" = false ]; then
  echo -e "${YELLOW}⚠️  未配置任何 OAuth 提供商（用户只能使用密码登录）${NC}"
  ((WARNINGS++))
fi
echo ""

# 9. 总结
echo "======================================"
echo "📊 检查总结"
echo "======================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}🎉 所有检查通过！可以部署。${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  发现 $WARNINGS 个警告，建议修复后再部署。${NC}"
  exit 0
else
  echo -e "${RED}❌ 发现 $ERRORS 个错误和 $WARNINGS 个警告，请修复后再部署。${NC}"
  exit 1
fi

