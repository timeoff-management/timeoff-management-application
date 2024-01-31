output "deployment_group_name" {
  value = "AppECS-${var.ecs_cluster}-${var.ecs_service}"
}
