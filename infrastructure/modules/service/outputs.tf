output "primary_target_group" {
  value = aws_lb_target_group.primary.name
}

output "secondary_target_group" {
  value = aws_lb_target_group.secondary.name
}

output "service_name" {
  value = aws_ecs_service.main.name
}