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

variable "opa_version" {
  type        = string
  description = "OPA image sürümü. Lokalde test edilen sürümle aynı olmalı; latest kullanılmaz."
  default     = "1.21.1"
}

variable "gateway_port" {
  type        = number
  description = "Gateway'in host üzerinde açılacağı port. Dışarıya açılan tek port."
  default     = 8080

  validation {
    condition     = var.gateway_port >= 1024 && var.gateway_port <= 65535
    error_message = "gateway_port 1024 ile 65535 arasında olmalı."
  }
}