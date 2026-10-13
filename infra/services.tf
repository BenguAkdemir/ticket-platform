locals {
  apps = {
    server = {
      context = abspath("${path.module}/../server")
      sources = ["Dockerfile", "package.json", "package-lock.json", "src/**"]
    }
    gateway = {
      context = abspath("${path.module}/../gateway")
      sources = ["Dockerfile", "go.mod", "go.sum", "cmd/**", "internal/**"]
    }
  }
}

resource "docker_image" "app" {
  for_each = local.apps

  name = "ticket-${each.key}:dev"

  build {
    context = each.value.context
  }

  triggers = {
    source_hash = sha1(join("", [
      for f in sort(setunion([for p in each.value.sources : fileset(each.value.context, p)]...)) :
      filesha1("${each.value.context}/${f}")
    ]))
  }
}

resource "docker_image" "opa" {
  name         = "openpolicyagent/opa:${var.opa_version}"
  keep_locally = true
}

module "opa" {
  source = "./modules/service"

  name         = "ticket-opa"
  image        = docker_image.opa.image_id
  network_name = docker_network.platform.name
  command      = ["run", "--server", "--addr=0.0.0.0:8181", "/policy/authz.rego"]

  volumes = [{
    host_path      = abspath("${path.module}/../policy/ticket")
    container_path = "/policy"
  }]
}

module "server" {
  source = "./modules/service"

  name         = "ticket-server"
  image        = docker_image.app["server"].image_id
  network_name = docker_network.platform.name

  env = {
    DATABASE_URL = "postgresql://postgres:${var.db_password}@${module.postgres.host}:5432/postgres"
  }

  healthcheck = ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost:3000/healthz"]
}

module "gateway" {
  source = "./modules/service"

  name         = "ticket-gateway"
  image        = docker_image.app["gateway"].image_id
  network_name = docker_network.platform.name

  env = {
    GATEWAY_ADDR   = ":8080"
    SERVER_URL     = "http://${module.server.name}:3000"
    OPA_URL        = "http://${module.opa.name}:8181"
    JWT_PUBLIC_KEY = "/keys/public.pem"
  }

  ports = [{
    internal = 8080
    external = var.gateway_port
  }]

  volumes = [{
    host_path      = abspath("${path.module}/../gateway/dev-keys/public.pem")
    container_path = "/keys/public.pem"
  }]

  healthcheck = ["CMD", "/gateway", "healthcheck"]
}