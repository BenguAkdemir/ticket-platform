resource "docker_network" "platform" {
  name = "ticket-platform"
}

module "postgres" {
  source = "./modules/postgres"

  db_password  = var.db_password
  db_port      = var.db_port
  network_name = docker_network.platform.name
}

moved {
  from = docker_image.postgres
  to   = module.postgres.docker_image.postgres
}

moved {
  from = docker_volume.postgres_data
  to   = module.postgres.docker_volume.postgres_data
}

moved {
  from = docker_container.postgres
  to   = module.postgres.docker_container.postgres
}