# STAC Credentials
export STAC_AWS_ACCESS_KEY_ID=$(aws secretsmanager get-secret-value     --secret-id STAC_Credentials | jq .SecretString | jq fromjson | jq -r .AWS_ACCESS_KEY_ID)
export STAC_AWS_SECRET_ACCESS_KEY=$(aws secretsmanager get-secret-value     --secret-id STAC_Credentials | jq .SecretString | jq fromjson | jq -r .AWS_SECRET_ACCESS_KEY)

# Kobo Credentials
export KOBO_USERNAME=$(aws secretsmanager get-secret-value     --secret-id KOBO_AUTHENTICATION | jq .SecretString | jq fromjson | jq -r .KOBO_USERNAME)
export KOBO_PASSWORD=$(aws secretsmanager get-secret-value     --secret-id KOBO_AUTHENTICATION | jq .SecretString | jq fromjson | jq -r .KOBO_PASSWORD)

# PRISM Alerts
export PRISM_ALERTS_DATABASE_URL=$(aws secretsmanager get-secret-value     --secret-id PRISM_ALERTS_DATABASE_URL | jq .SecretString | jq fromjson | jq -r .PRISM_ALERTS_DATABASE_URL)
export PRISM_ALERTS_EMAIL_USER=$(aws secretsmanager get-secret-value     --secret-id PRISM_ALERTS_EMAIL | jq .SecretString | jq fromjson | jq -r .PRISM_ALERTS_EMAIL_USER)
export PRISM_ALERTS_EMAIL_PASSWORD=$(aws secretsmanager get-secret-value     --secret-id PRISM_ALERTS_EMAIL | jq .SecretString | jq fromjson | jq -r .PRISM_ALERTS_EMAIL_PASSWORD)
export PRISM_ALERTS_EMAIL_HOST=$(aws secretsmanager get-secret-value     --secret-id PRISM_ALERTS_EMAIL | jq .SecretString | jq fromjson | jq -r .PRISM_ALERTS_EMAIL_HOST)

# HDC Token
export HDC_TOKEN=$(aws secretsmanager get-secret-value     --secret-id HDC_TOKEN | jq .SecretString | jq fromjson | jq -r .HDC_TOKEN)

# ACLED Credentials
export ACLED_API_KEY=$(aws secretsmanager get-secret-value     --secret-id ACLED_CREDENTIALS | jq .SecretString | jq fromjson | jq -r .ACLED_API_KEY)
export ACLED_API_EMAIL=$(aws secretsmanager get-secret-value     --secret-id ACLED_CREDENTIALS | jq .SecretString | jq fromjson | jq -r .ACLED_API_EMAIL)

# Google Flood
export GOOGLE_FLOODS_API_KEY=$(aws secretsmanager get-secret-value     --secret-id GOOGLE_FLOODS_API_KEY | jq .SecretString | jq fromjson | jq -r .GOOGLE_FLOODS_API_KEY)

export HOSTNAME=prism-api.ovio.org
export INFO_EMAIL=info@ovio.org
