# 生成 AMFE Reader 图标 PNG —— 紫蓝渐变字母 A
# 使用 .NET System.Drawing 直接绘制，无需外部依赖
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$resDir = Join-Path $root 'resources'
if (-not (Test-Path $resDir)) { New-Item -ItemType Directory -Path $resDir | Out-Null }

function Draw-Icon($size, $path) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # 圆角矩形背景 + 紫蓝渐变
    $radius = [int]($size * 0.22)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path2.AddArc($rect.X, $rect.Y, $radius * 2, $radius * 2, 180, 90)
    $path2.AddArc($rect.Right - $radius * 2, $rect.Y, $radius * 2, $radius * 2, 270, 90)
    $path2.AddArc($rect.Right - $radius * 2, $rect.Bottom - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $path2.AddArc($rect.X, $rect.Bottom - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $path2.CloseFigure()

    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(0x7C, 0x3A, 0xED), [System.Drawing.Color]::FromArgb(0x3B, 0x82, 0xF6), 45)
    $g.FillPath($brush, $path2)

    # 字母 A
    $fontSize = [int]($size * 0.62)
    $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, [float]($size * -0.05), $size, $size)
    $g.DrawString('A', $font, $textBrush, $textRect, $sf)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $brush.Dispose()
    $font.Dispose()
    $textBrush.Dispose()
    $sf.Dispose()
    Write-Host "生成: $path"
}

# 应用图标 256x256
Draw-Icon 256 (Join-Path $resDir 'icon.png')
# 托盘图标 32x32
Draw-Icon 32 (Join-Path $resDir 'tray.png')
# 应用图标小尺寸 16x16（托盘备用）
Draw-Icon 16 (Join-Path $resDir 'tray-16.png')

Write-Host '图标生成完成'
