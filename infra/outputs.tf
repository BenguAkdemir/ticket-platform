output "db_port" {
  description = "PostgreSQL'in host üzerindeki portu."
  value       = docker_container.postgres.ports[0].external
}

output "db_url" {
  description = "Server'ın kullanacağı PostgreSQL bağlantı adresi."
  value       = "postgresql://postgres:${var.db_password}@127.0.0.1:${docker_container.postgres.ports[0].external}/postgres"
  sensitive   = true
}