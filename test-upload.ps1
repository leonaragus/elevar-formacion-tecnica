# Script de prueba para subida de materiales
# Necesita autenticación, probaremos con un curso de prueba

$testFile = "test-file.pdf"
$cursoId = "test-curso-001"  # ID de curso de prueba

# Verificar que el archivo existe
if (-not (Test-Path $testFile)) {
    Write-Error "El archivo de prueba no existe: $testFile"
    exit 1
}

# Crear form-data para la subida
$boundary = [System.Guid]::NewGuid().ToString()
$bodyLines = @()

# Headers con token de administrador
$headers = @{
    "X-Admin-Token" = "admin-test-token-12345"
    "Content-Type" = "multipart/form-data; boundary=$boundary"
}

# Agregar curso_id
$bodyLines += "--$boundary"
$bodyLines += "Content-Disposition: form-data; name=`"curso_id`""
$bodyLines += ""
$bodyLines += $cursoId

# Agregar archivo
$bodyLines += "--$boundary"
$bodyLines += "Content-Disposition: form-data; name=`"file`"; filename=`"$testFile`""
$bodyLines += "Content-Type: application/pdf"
$bodyLines += ""
$bodyLines += [System.IO.File]::ReadAllText($testFile)
$bodyLines += "--$boundary--"

$body = $bodyLines -join "`r`n"

# Headers
try {
    Write-Host "Probando subida de material al curso: $cursoId" -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/materiales" -Method Post -Headers $headers -Body $body
    
    Write-Host "✅ SUBIDA EXITOSA!" -ForegroundColor Green
    Write-Host "Respuesta: " -NoNewline
    $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ ERROR en la subida:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Mensaje: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $errorResponse = $reader.ReadToEnd()
        Write-Host "Detalles: $errorResponse" -ForegroundColor Red
    }
}