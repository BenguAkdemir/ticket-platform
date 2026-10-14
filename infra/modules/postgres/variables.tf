variable "db_password" {
  type        = string
  description = "PostgreSQL superuser şifresi."
  sensitive   = true
}

variable "network_name" {
  type        = string
  description = "Container'ın bağlanacağı Docker network'ünün adı."
}