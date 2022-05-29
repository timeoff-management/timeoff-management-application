output "deployment_application_name" {
  value = aws_codedeploy_app.app.name
}

output "deployment_group_name" {
  value = "${var.application_name}-dpg"
}
