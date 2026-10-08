variable "db_password" {
  type        = string
  description = "PostgreSQL superuser şifresi."
  sensitive   = true
}

variable "db_port" {
  type        = number
  description = "PostgreSQL'in host üzerinde açılacağı port."
}

variable "network_name" {
  type        = string
  description = "Container'ın bağlanacağı Docker network'ünün adı."
}