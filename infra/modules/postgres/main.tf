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

  wait = true

  networks_advanced {
    name = var.network_name
  }

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql"
  }

  healthcheck {
    test     = ["CMD", "pg_isready", "-U", "postgres"]
    interval = "5s"
    timeout  = "3s"
    retries  = 5
  }
}