# Script de teste - NOWPayments
Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     TESTE NOWPAYMENTS - CRYPTO PAYMENT           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "http://127.0.0.1:3000"

# Teste 1: Health check
Write-Host "▶ TESTE 1: Verificando se servidor está rodando..." -ForegroundColor Yellow
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/orders/health-check" -Method GET -ErrorAction Stop
    Write-Host "✅ Servidor está respondendo!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Servidor não está rodando. Inicie com: npm run start:dev`n" -ForegroundColor Red
    exit 1
}

# Teste 2: Criar pedido
Write-Host "▶ TESTE 2: Criando pedido..." -ForegroundColor Yellow
$body = @{
    amount_usd = 10
    currency = "USDT"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/orders" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Pedido criado com sucesso!" -ForegroundColor Green
    Write-Host "   Order ID: $($response.order_id)" -ForegroundColor Gray
    Write-Host "   Address: $($response.address)" -ForegroundColor Gray
    Write-Host "   Amount: $($response.amount) $($response.currency)" -ForegroundColor Gray
    Write-Host "   Invoice URL: $($response.invoice_url)" -ForegroundColor Gray
    Write-Host "   Expires: $($response.expires_at)`n" -ForegroundColor Gray
    
    $orderId = $response.order_id
    $invoiceUrl = $response.invoice_url
    
} catch {
    Write-Host "❌ Erro ao criar pedido" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host "`n💡 Verifique se as credenciais NOWPayments estão configuradas no .env`n" -ForegroundColor Yellow
    exit 1
}

# Teste 3: Consultar pedido
Write-Host "▶ TESTE 3: Consultando pedido..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $order = Invoke-RestMethod -Uri "$baseUrl/orders/$orderId" -Method GET
    Write-Host "✅ Status do pedido: $($order.status)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao consultar pedido`n" -ForegroundColor Red
}

# Teste 4: Abrir URL de pagamento
Write-Host "▶ TESTE 4: Abrindo URL de pagamento no navegador..." -ForegroundColor Yellow
Write-Host "   URL: $invoiceUrl" -ForegroundColor Gray
Start-Process $invoiceUrl
Write-Host "✅ Navegador aberto. Você pode pagar para testar o fluxo completo!`n" -ForegroundColor Green

# Teste 5: Verificar banco
Write-Host "▶ TESTE 5: Verificar no banco de dados..." -ForegroundColor Yellow
Write-Host "   Abra o DBeaver e execute:" -ForegroundColor Gray
Write-Host "   SELECT * FROM orders WHERE id = '$orderId';" -ForegroundColor Cyan
Write-Host ""

Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              TESTES CONCLUÍDOS                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Pague o pedido usando a URL aberta" -ForegroundColor White
Write-Host "   2. Aguarde 1-5 minutos para confirmação" -ForegroundColor White
Write-Host "   3. Verifique se status mudou para PAID" -ForegroundColor White
Write-Host "   4. Consulte novamente: GET $baseUrl/orders/$orderId`n" -ForegroundColor White
