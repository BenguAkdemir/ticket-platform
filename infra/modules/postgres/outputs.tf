output "host" {
  description = "Container'ın Docker network'ündeki adı; diğer container'lar bu adla bağlanır."
  value       = docker_container.postgres.name
}