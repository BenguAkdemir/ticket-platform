output "name" {
  description = "Container adı; diğer container'lar bu adla bağlanır."
  value       = docker_container.this.name
}