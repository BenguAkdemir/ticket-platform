output "db_port" {
  description = "PostgreSQL'in host üzerindeki portu."
  value       = docker_container.postgres.ports[0].external
}

output "host" {
  description = "Container'ın Docker network'ündeki adı; diğer container'lar bu adla bağlanır."
  value       = docker_container.postgres.name
}