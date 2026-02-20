param(
  [string]$SecretName = "legal-dashboard-jwt",
  [string]$Region = "us-east-1",
  [string]$Profile
)

$ErrorActionPreference = "Stop"

$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secretValue = [Convert]::ToBase64String($bytes)

$args = @("secretsmanager", "put-secret-value", "--secret-id", $SecretName, "--secret-string", $secretValue, "--region", $Region)
if ($Profile) {
  $args += @("--profile", $Profile)
}

aws @args | Out-Null
Write-Output "JWT secret rotated in Secrets Manager. Existing tokens are now invalid."
