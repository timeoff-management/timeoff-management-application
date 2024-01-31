output "ecr_repo_name" {
  value = aws_ecr_repository.main.name
}

output "ecr_repo_arn" {
  value = aws_ecr_repository.main.arn
}
output "public_subnets" {
  value = module.vpc.public_subnets
}
output "private_subnets" {
  value = module.vpc.private_subnets
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "alb_security_group" {
  value = module.web_security_group.security_group_id
}

output "alb_arn" {
  value = aws_lb.this.arn
}

output "codestar_connection_arn" {
  value = aws_codestarconnections_connection.main.arn
}

output "http_listener_arn" {
  value = aws_lb_listener.http.arn
}


output "https_listener_arn" {
  value = aws_lb_listener.https.arn
}