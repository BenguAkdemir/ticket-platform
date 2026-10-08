resource "docker_network" "platform" {
  name = "ticket-platform"
}

resource "docker_image" "postgres" {
  name         = "postgres:18"
  keep_locally = true
}

resource "docker_volume" "postgres_data" {
  name = "ticket-postgres-data"
}

resource "docker_container" "postgres" {
  name  = "ticket-postgres"
  image = docker_image.postgres.image_id

  env = [
    "POSTGRES_PASSWORD=${var.db_password}",
  ]

  networks_advanced {
    name = docker_network.platform.name
  }

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql"
  }

  ports {
    internal = 5432
    external = var.db_port
    ip       = "127.0.0.1"
  }
}