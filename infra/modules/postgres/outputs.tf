output "db_port" {
  description = "PostgreSQL'in host üzerindeki portu."
  value       = docker_container.postgres.ports[0].external
}