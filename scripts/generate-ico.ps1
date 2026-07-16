# 生成 ICO 文件（从 PNG 转换）供 electron-builder 打包使用
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$resDir = Join-Path $root 'resources'
$pngPath = Join-Path $resDir 'icon.png'
$icoPath = Join-Path $resDir 'icon.ico'

if (-not (Test-Path $pngPath)) {
    Write-Error 'icon.png 不存在，请先运行 convert-icons.ps1'
    exit 1
}

$bmp = [System.Drawing.Image]::FromFile($pngPath)
$bmp.Save($icoPath, [System.Drawing.Imaging.ImageFormat]::Icon)
$bmp.Dispose()
Write-Host "生成: $icoPath"
