# STAC Credentials
export STAC_AWS_ACCESS_KEY_ID=$(aws secretsmanager get-secret-value     --secret-id STAC_Credentials | jq .SecretString | jq fromjson | jq .AWS_ACCESS_KEY_ID)
export STAC_AWS_SECRET_ACCESS_KEY=$(aws secretsmanager get-secret-value     --secret-id STAC_Credentials | jq .SecretString | jq fromjson | jq .AWS_SECRET_ACCESS_KEY)

# Kobo Credentials
export KOBO_USERNAME=$(aws secretsmanager get-secret-value     --secret-id KOBO_AUTHENTICATION | jq .SecretString | jq fromjson | jq .KOBO_USERNAME)
export KOBO_PASSWORD=$(aws secretsmanager get-secret-value     --secret-id KOBO_AUTHENTICATION | jq .SecretString | jq fromjson | jq .KOBO_PASSWORD)

# PRISM Alerts
export PRISM_ALERTS_DATABASE_URL=$(aws secretsmanager get-secret-value     --secret-id PRISM_ALERTS_DATABASE_URL | jq .SecretString | jq fromjson | jq .PRISM_ALERTS_DATABASE_URL)

# HDC Token
export HDC_TOKEN=$(aws secretsmanager get-secret-value     --secret-id HDC_TOKEN | jq .SecretString | jq fromjson | jq .HDC_TOKEN)

# Alerting Email
export ALERTING_EMAIL_USER=$(aws secretsmanager get-secret-value     --secret-id ALERTING_EMAIL | jq .SecretString | jq fromjson | jq .ALERTING_EMAIL_USER)
export ALERTING_EMAIL_PASSWORD=$(aws secretsmanager get-secret-value     --secret-id ALERTING_EMAIL | jq .SecretString | jq fromjson | jq .ALERTING_EMAIL_PASSWORD)

export HOSTNAME=prism-api.ovio.org
echo $HOSTNAME
