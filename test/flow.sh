#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# TESTE DE FLUXO REAL — crypto-payment-backend
# Roda: chmod +x test/flow.sh && ./test/flow.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
WEBHOOK_SECRET="${COINGATE_WEBHOOK_SECRET:-test-secret}"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║       TESTE DE FLUXO — PAGAMENTO CRIPTO          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ─── PASSO 1: Criar pedido ───────────────────────────────────────────────────
echo "▶ PASSO 1: Criando pedido..."

ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{"amount_usd": 50.00, "currency": "USDT"}')

echo "Resposta:"
echo "$ORDER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ORDER_RESPONSE"
echo ""

ORDER_ID=$(echo "$ORDER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['order_id'])" 2>/dev/null)
INVOICE_ID=$(echo "$ORDER_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('invoice_id',''))" 2>/dev/null)
ADDRESS=$(echo "$ORDER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['address'])" 2>/dev/null)

if [ -z "$ORDER_ID" ]; then
  echo "❌ Falhou ao criar pedido. Verifique se o backend está rodando e o COINGATE_API_KEY está configurado."
  exit 1
fi

echo "✅ Pedido criado:"
echo "   order_id : $ORDER_ID"
echo "   address  : $ADDRESS"
echo ""

# ─── PASSO 2: Verificar status do pedido ─────────────────────────────────────
echo "▶ PASSO 2: Verificando status do pedido..."

STATUS_RESPONSE=$(curl -s "$BASE_URL/orders/$ORDER_ID")
echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

# ─── PASSO 3: Simular webhook de pagamento confirmado ────────────────────────
echo "▶ PASSO 3: Simulando webhook de pagamento confirmado..."

# Use o invoice_id real retornado pelo CoinGate se disponível
# ou um ID fake para teste local
FAKE_INVOICE_ID="${INVOICE_ID:-test-invoice-$(date +%s)}"

WEBHOOK_PAYLOAD=$(cat <<EOF
{
  "id": "$FAKE_INVOICE_ID",
  "status": "paid",
  "price_amount": 50.00,
  "price_currency": "USD",
  "receive_currency": "USDT",
  "receive_amount": 50.05,
  "pay_amount": 50.05,
  "pay_currency": "USDT",
  "order_id": "$ORDER_ID",
  "token": "test-token"
}
EOF
)

# Gera assinatura HMAC-SHA256 (requer openssl)
SIGNATURE=$(echo -n "$WEBHOOK_PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

echo "Enviando webhook com assinatura: $SIGNATURE"
echo ""

WEBHOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/coingate" \
  -H "Content-Type: application/json" \
  -H "x-coingate-signature: $SIGNATURE" \
  -d "$WEBHOOK_PAYLOAD")

echo "Resposta do webhook:"
echo "$WEBHOOK_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$WEBHOOK_RESPONSE"
echo ""

# ─── PASSO 4: Verificar se pedido virou PAID ─────────────────────────────────
echo "▶ PASSO 4: Verificando se pedido virou PAID..."
sleep 1

FINAL_STATUS=$(curl -s "$BASE_URL/orders/$ORDER_ID")
echo "$FINAL_STATUS" | python3 -m json.tool 2>/dev/null || echo "$FINAL_STATUS"
echo ""

STATUS=$(echo "$FINAL_STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)

echo "──────────────────────────────────────────────────"
if [ "$STATUS" = "PAID" ]; then
  echo "✅ SUCESSO! Pedido $ORDER_ID está PAID"
else
  echo "⚠️  Status atual: $STATUS (esperado: PAID)"
  echo "   Verifique se o invoice_id no webhook bate com o gerado pelo CoinGate"
fi
echo "──────────────────────────────────────────────────"
echo ""

# ─── TESTE DE RATE LIMIT ──────────────────────────────────────────────────────
echo "▶ BÔNUS: Testando rate limit (4 pedidos rápidos, limite é 3/min)..."
for i in 1 2 3 4; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/orders" \
    -H "Content-Type: application/json" \
    -d '{"amount_usd": 1.00, "currency": "BTC"}')
  echo "   Requisição $i → HTTP $CODE"
done
echo ""
echo "A 4ª requisição deve retornar HTTP 429 (Too Many Requests)"
