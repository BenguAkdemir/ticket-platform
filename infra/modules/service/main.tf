resource "docker_container" "this" {
  name    = var.name
  image   = var.image
  command = var.command
  env     = [for k, v in var.env : "${k}=${v}"]

  wait = var.healthcheck != null

  networks_advanced {
    name = var.network_name
  }

  dynamic "ports" {
    for_each = var.ports
    content {
      internal = ports.value.internal
      external = ports.value.external
      ip       = "127.0.0.1"
    }
  }

  dynamic "volumes" {
    for_each = var.volumes
    content {
      host_path      = volumes.value.host_path
      container_path = volumes.value.container_path
      read_only      = true
    }
  }

  dynamic "healthcheck" {
    for_each = var.healthcheck == null ? [] : [var.healthcheck]
    content {
      test     = healthcheck.value
      interval = "5s"
      timeout  = "3s"
      retries  = 5
    }
  }
}