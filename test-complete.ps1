# Script de teste completo - PowerShell
Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       TESTE COMPLETO - CRYPTO PAYMENT            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "http://127.0.0.1:3000"

# Teste 1: Criar pedido
Write-Host "▶ TESTE 1: Criando pedido..." -ForegroundColor Yellow
$body = @{
    amount_usd = 100
    currency = "USDT"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/orders" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Pedido criado com sucesso!" -ForegroundColor Green
    Write-Host "   Order ID: $($response.order_id)" -ForegroundColor Gray
    Write-Host "   Address: $($response.address)" -ForegroundColor Gray
    Write-Host "   Amount: $($response.amount) $($response.currency)" -ForegroundColor Gray
    Write-Host "   Expires: $($response.expires_at)`n" -ForegroundColor Gray
    
    $orderId = $response.order_id
    
    # Teste 2: Consultar pedido
    Write-Host "▶ TESTE 2: Consultando pedido..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    $order = Invoke-RestMethod -Uri "$baseUrl/orders/$orderId" -Method GET
    Write-Host "✅ Status do pedido: $($order.status)" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Teste 3: Rate Limit
Write-Host "▶ TESTE 3: Testando rate limit (10 req/min)..." -ForegroundColor Yellow
$success = 0
$blocked = 0

for ($i = 1; $i -le 12; $i++) {
    try {
        $null = Invoke-RestMethod -Uri "$baseUrl/orders" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        $success++
        Write-Host "   Req $i → ✅ OK" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            $blocked++
            Write-Host "   Req $i → ⛔ BLOQUEADO (429 Too Many Requests)" -ForegroundColor Red
        } else {
            Write-Host "   Req $i → ❌ Erro: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Milliseconds 100
}

Write-Host "`n📊 Resultado Rate Limit:" -ForegroundColor Cyan
Write-Host "   Sucesso: $success" -ForegroundColor Green
Write-Host "   Bloqueadas: $blocked" -ForegroundColor Red
Write-Host ""

# Teste 4: Verificar banco de dados
Write-Host "▶ TESTE 4: Verificando banco de dados..." -ForegroundColor Yellow
Write-Host "   Abra o DBeaver e execute:" -ForegroundColor Gray
Write-Host "   SELECT id, amount_usd, currency, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Cyan
Write-Host ""

Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              TESTES CONCLUÍDOS                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
