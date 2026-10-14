output "gateway_url" {
  description = "Sisteme dışarıdan ulaşmanın tek yolu."
  value       = "http://127.0.0.1:${var.gateway_port}"
}