variable "name" {
  type        = string
  description = "Container adı. Diğer container'lar bu adla bağlanır."
}

variable "image" {
  type        = string
  description = "Kullanılacak image'ın id'si."
}

variable "network_name" {
  type        = string
  description = "Bağlanılacak Docker network'ü."
}

variable "env" {
  type        = map(string)
  description = "Environment variable'lar."
  default     = {}
}

variable "command" {
  type        = list(string)
  description = "Image'ın varsayılan komutunun yerine çalışacak komut."
  default     = null
}

variable "ports" {
  type = list(object({
    internal = number
    external = number
  }))
  description = "Host'a açılacak portlar. Boşsa container dışarıdan erişilemez."
  default     = []
}

variable "volumes" {
  type = list(object({
    host_path      = string
    container_path = string
  }))
  description = "Host'tan salt okunur bağlanacak dosya ya da klasörler."
  default     = []
}

variable "healthcheck" {
  type        = list(string)
  description = "Docker healthcheck komutu. null ise healthcheck yok ve Terraform container'ın hazır olmasını beklemez."
  default     = null
}