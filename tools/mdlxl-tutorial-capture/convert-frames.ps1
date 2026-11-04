param([Parameter(Mandatory=$true)][string]$Manifest)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$frames=Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
foreach($f in $frames){$image=[Drawing.Bitmap]::FromFile($f.source);try{$image.Save($f.target,[Drawing.Imaging.ImageFormat]::Bmp)}finally{$image.Dispose()}}
