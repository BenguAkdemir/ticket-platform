output "db_port" {
  description = "PostgreSQL'in host üzerindeki portu."
  value       = module.postgres.db_port
}

output "db_url" {
  description = "Server'ın kullanacağı PostgreSQL bağlantı adresi."
  value       = "postgresql://postgres:${var.db_password}@127.0.0.1:${module.postgres.db_port}/postgres"
  sensitive   = true
}