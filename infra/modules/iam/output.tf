output "ecs_execution_role_name" {
  description = "Name of the ECS Execution Role"
  value = aws_iam_role.ecs_execution.name
}

output "ecs_execution_role_arn" {
  description = "ARN of the ECS Execution Role"
  value = aws_iam_role.ecs_execution.arn
}

output "ecs_execution_role_id" {
  description = "ID of the ECS Execution Role"
  value = aws_iam_role.ecs_execution.id
}
