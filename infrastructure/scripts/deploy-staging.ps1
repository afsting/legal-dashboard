param(
  [Parameter(Mandatory = $true)]
  [string]$FrontendOrigin,
  [string]$JwtSecret,
  [string]$JwtExpiry = "7d"
)

$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "..")
try {
  npm install | Out-Null
  $args = @("-c", "frontendOrigin=$FrontendOrigin", "-c", "jwtExpiry=$JwtExpiry")
  if ($JwtSecret) {
    $args += @("-c", "jwtSecret=$JwtSecret")
  }
  cdk deploy @args
} finally {
  Pop-Location
}
