# PowerShell script to update .env file with new Firebase credentials

$envFile = ".env"

# Read current .env content
$content = Get-Content $envFile -Raw

# New credentials
$newProjectId = "taxibooking76"
$newClientEmail = "firebase-adminsdk-fbsvc@taxibooking76.iam.gserviceaccount.com"
$newPrivateKey = @"
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDBBzqdxGM49PWh
HROyBu+65a1fn3vwo9DuHrILtPatj64GyI9+MhHDlSwpZOahl9qU0Ocl0yCqP/f/
K/oMgQZhL3E2+XYWm8qp4VBKZoG1+VhDkalo4JcNpn7psTy/7u+1I2zvuZHVtYx5
n8n6Xem4Y3HG15seh26ISkxe+TBI2jogecgMsaDhoR9qc0HYw+6Y2aVcWksN+a5b
GJvxcSVH7SuN1UcpjuR2djBAtByk0VmyQPsjJkxEAcYpQLWHaoq0QOJ1726Ockki
BVBqrbqnk65FFG9wp6QAU9pIGWrWcvccu7C3S3IBVHU9y6qdz/Anb2ActbOhAcjn
DwPNBn9PAgMBAAECggEABQlZQDCVnjDWD+QgVW7U5n2DrpEMvNSpaO0oHCIWpaSw
F8E37UUFLaNAybu2QNUjgOqKfXQq0AZnRCMznQvozLReMd8Ec8aQ3Snh3G8cR1FA
OlMcpn3lsxd7DEHxodhsLL/F4eNnqLnZ9npy3LOCm6sMlvGdPIiwG6JEp928osnz
OGGVZjVN0q+kOvZncichykJgAdr+M1qqSPIHrCSEwDKxzcXYXz1bf227aL9a/PEm
O2aq+S5vXP0usJQp7U8pFTcVDNgSvHn1I1/GJwNQVx0t7ytaZ5nBjbNmovDKmYcz
/F+0bWCS/SED19V8gKYT9NaXogQYc701IktAmn3jYQKBgQD5yXKMYJ1pJshZCR2h
QdFQ3WFlpMEijknpydIehQdzINA6WyLXs22YKKzFBGsvQEcQlrBcIU3jqyXZA79x
+NwyUxLsW+ozqpVk3OcG1+ZPV3H1pVv3rS+3/LxDK10JgAf7MrR7ulCPG4kqegSX
g8OIrmJR4Ipj9563Ku2gheay+QKBgQDF1FzmEhMD7rnMRzC882Fohwwevzu7da0g
i9a3L023b1rrvRRSjh+wyijOkc2bm5ysbl5DaKIiBXcST0uXxXxSVcbsO2MChIuC
KW9/8viev5YJae65yqFeLCtzbkMvljkN8UKrsa1IcZ7VRFO/2BcXsPWhdMygOqeB
MSTYr9iOhwKBgQDaHjrUshlClQcmGHuzMNIjFu3R4Eh2cGHCsOW2mNukgObTznli
eeAdmocjk3Q1Up+7sJpYGQz23aCzHD60u2cs2rYPh0O/0hmadfuXUjhe2DE/HCJu
6OBefWe4D8myXgaaJ/DKiiuGi7j/SoVv+TNpyz032id+m+AQen/+SG7noQKBgQCr
bQhLPaJIqBdMkuwC8Auanlu8UQ4btS8eos6e0ljP+aiZ2rC/kPSZJ7UQu3ulucSc
Ds+ULhlAzeeOcDQbAkBmwHmtvxBe4Chb1DgQcaVLOs1yvt7lFFec2T2VuxhxJgWu
tT+GtGJqAjsWpyzDcycfmnJfRG0E846u/rzlIAvSBQKBgAGjsmMYNVeU1GdmxJ9X
D9MRA+J1bsZBMwtVuivhOflLlEf4XVGBAhJ/My5tNovAzS/rgRC+5AmXL+FUE0ed
Pe3hVnkx8N0Q+sxN2J42nEufrtZSeSpZ8Ir/N9J+OD2UHMbdwCPoNQm9qbxahGvN
JU3dQE3vlgcV0F80UT0rdppL
-----END PRIVATE KEY-----
"@

# Replace newlines with \n for .env format
$privateKeyForEnv = $newPrivateKey -replace "`r?`n", "\n"

# Update the values
$content = $content -replace 'FIREBASE_PROJECT_ID=.*', "FIREBASE_PROJECT_ID=$newProjectId"
$content = $content -replace 'FIREBASE_CLIENT_EMAIL=.*', "FIREBASE_CLIENT_EMAIL=$newClientEmail"
$content = $content -replace 'FIREBASE_PRIVATE_KEY=.*', "FIREBASE_PRIVATE_KEY=`"$privateKeyForEnv`""

# Write back to file
$content | Set-Content $envFile -NoNewline

Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Updated values:"
Write-Host "  FIREBASE_PROJECT_ID=$newProjectId"
Write-Host "  FIREBASE_CLIENT_EMAIL=$newClientEmail"
Write-Host "  FIREBASE_PRIVATE_KEY=[Updated with quotes]"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Run: npm run seed"
Write-Host "  2. Run: npm run dev"

