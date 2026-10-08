variable "db_password" {
  type        = string
  description = "PostgreSQL superuser şifresi."
  sensitive   = true
}

variable "db_port" {
  type        = number
  description = "PostgreSQL'in host üzerinde açılacağı port."
  default     = 5432

  validation {
    condition     = var.db_port >= 1024 && var.db_port <= 65535
    error_message = "db_port 1024 ile 65535 arasında olmalı."
  }
}