# Setup Docker Swarm and Traefik.

export USE_HOSTNAME=$(hostname)

docker swarm init

# Create a network that will be shared with Traefik and the containers
# that should be accessible from the outsid
docker network create --driver=overlay traefik-public
# Create a volume in where Traefik will store HTTPS certificate
docker volume create traefik-public-certificates

# Get the Swarm node ID of this node and store it in an environment variable:
export NODE_ID=$(docker info -f '{{.Swarm.NodeID}}')

# Create a tag in this node, so that Traefik is always deployed to the same node and uses the existing volume:
docker node update --label-add traefik-public.traefik-public-certificates=true $NODE_ID

export EMAIL=eric@ovio.org

read -p 'Admin Username: ' uservar
read -sp 'Admin Password: ' passvar

export USERNAME=$uservar
export PASSWORD=$passvar
export HASHED_PASSWORD=$(openssl passwd -apr1 $PASSWORD)
echo $HASHED_PASSWORD


# Create a Traefik service:
docker service create \
    --name traefik \
    --constraint=node.labels.traefik-public.traefik-public-certificates==true \
    --publish 80:80 \
    --publish 443:443 \
    --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
    --mount type=volume,source=traefik-public-certificates,target=/certificates \
    --network traefik-public \
    --label "traefik.frontend.rule=Host:traefik.$USE_HOSTNAME" \
    --label "traefik.enable=true" \
    --label "traefik.port=8080" \
    --label "traefik.tags=traefik-public" \
    --label "traefik.docker.network=traefik-public" \
    --label "traefik.redirectorservice.frontend.entryPoints=http" \
    --label "traefik.redirectorservice.frontend.redirect.entryPoint=https" \
    --label "traefik.webservice.frontend.entryPoints=https" \
    --label "traefik.frontend.auth.basic.users=${USERNAME}:${HASHED_PASSWORD}" \
    traefik:v1.7 \
    --docker \
    --docker.swarmmode \
    --docker.watch \
    --docker.exposedbydefault=false \
    --constraints=tag==traefik-public \
    --entrypoints='Name:http Address::80' \
    --entrypoints='Name:https Address::443 TLS' \
    --acme \
    --acme.email=$EMAIL \
    --acme.storage=/certificates/acme.json \
    --acme.entryPoint=https \
    --acme.httpChallenge.entryPoint=http\
    --acme.onhostrule=true \
    --acme.acmelogging=true \
    --logLevel=INFO \
    --accessLog \
    --api
