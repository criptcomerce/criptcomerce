# ============================================================
# Simula webhook da NOWPayments com assinatura HMAC-SHA512
# ============================================================

param(
    [string]$OrderId = "",
    [string]$PaymentId = "999999999",
    [string]$Status = "finished",
    [double]$Amount = 0.00001
)

# Se não passar order_id, cria um pedido novo
if (-not $OrderId) {
    Write-Host "Criando pedido..." -ForegroundColor Cyan
    $body = @{ amount_usd = 1; currency = "BTC" } | ConvertTo-Json
    $order = Invoke-RestMethod -Uri "http://127.0.0.1:3000/orders" -Method POST -Body $body -ContentType "application/json"
    $OrderId = $order.order_id
    Write-Host "Pedido criado: $OrderId" -ForegroundColor Green
    Write-Host ($order | ConvertTo-Json -Depth 5)
    Start-Sleep -Seconds 1
}

Write-Host "`nDisparando webhook para order: $OrderId" -ForegroundColor Cyan

# Monta o payload manualmente para evitar notação científica e separador de locale
# actually_paid = 1 (valor em USD para passar na validação do servidor)
$amountStr = $Amount.ToString("0.00000", [System.Globalization.CultureInfo]::InvariantCulture)
$payloadJson = "{`"actually_paid`":1,`"order_id`":`"$OrderId`",`"order_description`":`"Pedido $OrderId`",`"outcome_amount`":$amountStr,`"outcome_currency`":`"btc`",`"pay_address`":`"tb1qtest000000000000000000000000000`",`"pay_amount`":$amountStr,`"pay_currency`":`"btc`",`"payment_id`":$PaymentId,`"payment_status`":`"$Status`",`"price_amount`":1,`"price_currency`":`"usd`",`"purchase_id`":`"test-purchase-001`"}"

# Gera assinatura HMAC-SHA512
$secret = "EEXGP0PWVI2OBuKDPQgDKE8xzkrp609A"
$secretBytes = [System.Text.Encoding]::UTF8.GetBytes($secret)
$payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)
$hmac = New-Object System.Security.Cryptography.HMACSHA512
$hmac.Key = $secretBytes
$hashBytes = $hmac.ComputeHash($payloadBytes)
$signature = [BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()

Write-Host "Payload: $payloadJson" -ForegroundColor Gray
Write-Host "Signature: $signature" -ForegroundColor Gray

# Dispara o webhook
try {
    $response = Invoke-RestMethod `
        -Uri "http://127.0.0.1:3000/webhooks/nowpayments" `
        -Method POST `
        -Body $payloadJson `
        -ContentType "application/json" `
        -Headers @{ "x-nowpayments-sig" = $signature }

    Write-Host "`nResposta do webhook:" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "`nErro:" -ForegroundColor Red
    $_.Exception.Message
}

# Consulta status final do pedido
Start-Sleep -Seconds 1
Write-Host "`nStatus final do pedido:" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://127.0.0.1:3000/orders/$OrderId" | ConvertTo-Json -Depth 5
