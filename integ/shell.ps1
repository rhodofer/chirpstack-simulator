# integ/shell.ps1 - Persistent container ile hizli komut calistir
# Container surekli arka planda kalir; her komut exec ile calisir (1sn civari)
#
# Kullanim:
#   .\integ\shell.ps1 start                          # Container'i baslat
#   .\integ\shell.ps1 sim [sure_sn]                   # Simulasyon BASLAT (CTRL+C ile durdur)
#   .\integ\shell.ps1 list device-profiles            # Hizli komut (~1sn)
#   .\integ\shell.ps1 list applications
#   .\integ\shell.ps1 list gateways
#   .\integ\shell.ps1 add application 2
#   .\integ\shell.ps1 delete applications all --yes
#   .\integ\shell.ps1 stop-sim                        # Arka plandaki simulasyonu durdur
#   .\integ\shell.ps1 stop                            # Container'i durdur

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$cmdArgs
)

$BinDir = "C:\Projects\falt-workspace\chirpstack-simulator\build"
$CfgDir = "C:\Projects\falt-workspace\chirpstack-simulator\integ\simulator-config"
$ContainerName = "cs-sim-shell"

if ($cmdArgs.Count -eq 0) {
    Write-Host "Kullanim:" -ForegroundColor Yellow
    Write-Host "  .\integ\shell.ps1 start                    # Container'i baslat" -ForegroundColor Cyan
    Write-Host "  .\integ\shell.ps1 sim [sure]               # Simulasyon BASLAT (CTRL+C)" -ForegroundColor Cyan
    Write-Host "  .\integ\shell.ps1 stop-sim                  # Arka plandakini durdur" -ForegroundColor Cyan
    Write-Host "  .\integ\shell.ps1 list device-profiles     # Hizli komut (~1sn)" -ForegroundColor Cyan
    Write-Host "  .\integ\shell.ps1 list applications" -ForegroundColor Cyan
    Write-Host "  .\integ\shell.ps1 add application 2" -ForegroundColor Cyan
    Write-Host "  .\integ\shell.ps1 delete applications all --yes" -ForegroundColor Cyan
    Write-Host "  .\integ\shell.ps1 stop                     # Container'i durdur" -ForegroundColor Cyan
    exit
}

$Action = $cmdArgs[0]

if ($Action -eq "start") {
    Write-Host "Persistent container baslatiliyor..." -ForegroundColor Green
    docker rm -f $ContainerName 2>$null | Out-Null
    docker run -d --name $ContainerName `
        -v "${BinDir}:/app" `
        -v "${CfgDir}:/config" `
        alpine:3.19 `
        sh -c "apk add --no-cache libc6-compat >/dev/null 2>&1 && tail -f /dev/null"
    Write-Host "Container '$ContainerName' hazir!" -ForegroundColor Green
    Write-Host "Simulasyon: .\integ\shell.ps1 sim 30" -ForegroundColor Cyan
    exit
}

if ($Action -eq "stop") {
    Write-Host "Container durduruluyor..." -ForegroundColor Yellow
    docker rm -f $ContainerName 2>$null | Out-Null
    Write-Host "Durdu." -ForegroundColor Yellow
    exit
}

if ($Action -eq "sim") {
    $timeout = if ($cmdArgs.Count -gt 1) { $cmdArgs[1] } else { "0" }
    
    # once varsa eski simulasyonu durdur
    docker exec $ContainerName sh -c "pkill chirpstack-sim 2>/dev/null; exit 0" 2>$null | Out-Null
    
    Write-Host "Simulasyon baslatiliyor... (CTRL+C ile durdurun)" -ForegroundColor Green
    Write-Host "" -ForegroundColor Green

    if ($timeout -ne "0") {
        docker exec $ContainerName sh -c "timeout $timeout /app/chirpstack-simulator --config /config/integ.toml --apps 1"
    } else {
        docker exec $ContainerName sh -c "/app/chirpstack-simulator --config /config/integ.toml --apps 1"
    }

    Write-Host "" -ForegroundColor Green
    Write-Host "Simulasyon bitti." -ForegroundColor Yellow
    exit
}

if ($Action -eq "stop-sim") {
    Write-Host "Simulasyon durduruluyor..." -ForegroundColor Yellow
    docker exec $ContainerName sh -c "pkill chirpstack-sim 2>/dev/null; exit 0" 2>$null | Out-Null
    Write-Host "Durdu." -ForegroundColor Yellow
    exit
}

# Normal komut calistir
$SimArgs = $cmdArgs -join ' '
docker exec $ContainerName sh -c "/app/chirpstack-simulator --config /config/integ.toml $SimArgs"
