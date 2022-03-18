variable "role_arn" {
  description = "The ARN of the role to assume"
  type        = string
  default     = null
}

variable "session_name" {
  description = "The name of the session to create"
  type        = string
  default     = null
}

variable "region" {
  description = "The region to connect to"
  type        = string
  default     = "us-east-1"
}

variable "account_id" {
  description = "The account ID to connect to"
  type        = string
  default     = ""
}

variable "env" {
  description = "The environment to deploy to"
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "The domain name of the application"
  type        = string
  default     = "example.com"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
  default     = "vpc-12345678"
}

variable "app_name" {
  description = "The name of the application"
  type        = string
  default     = "my-app"
}

variable "service_name" {
  description = "AWS ECS service name"
  type        = string
  default     = ""
}

variable "cluster_id" {
  description = "The ECS cluster ID"
  type        = string
  default     = ""
}

variable "cluster_subnet_ids" {
  description = "Cluster subnet IDs"
  type        = list(any)
  default     = ["subnet-12345678"]
}

variable "container_name" {
  description = "The name of the container"
  type        = string
  default     = "my-container"
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 80
}

variable "deployment_controller_type" {
  description = "Deployment controller type"
  type        = string
  default     = "ECS"
}

variable "desired_count" {
  description = "Desired task count"
  type        = number
  default     = 1
}

variable "deployment_maximum_percent" {
  description = "Deployment maximum percent"
  type        = number
  default     = 200
}
variable "deployment_minimum_healthy_percent" {
  description = "Deployment minimum healthy percent"
  type        = number
  default     = 100
}

# ecs_task_definition
variable "task_definition_name" {
  description = "AWS ECS task definition name"
  type        = string
  default     = ""
}

variable "task_definition_filename" {
  description = "AWS ECS task definition filename"
  type        = string
  default     = ""
}

variable "network_mode" {
  description = "Network mode"
  default     = "awsvpc"
}

variable "cpu" {
  description = "CPU"
  default     = "256"
}

variable "memory" {
  description = "Memory for the task"
  default     = "512"
}

variable "execution_role_arn" {
  description = "Execution role ARN"
  type        = string
  default     = ""
}

variable "attach_volume" {
  description = "Attach volume"
  default     = false
}

variable "volume_name" {
  description = "Volume name"
  type        = string
  default     = null
}

variable "volume_host_path" {
  description = "Volume host path"
  type        = string
  default     = null
}

# Listeners
variable "aws_lb_arn" {
  description = "AWS LB ARN"
  type        = string
  default     = null
}

variable "service_protocol" {
  description = "ECS running service protocol"
  default     = "HTTP"
}



variable "healthcheck_path" {
  description = "Healthcheck path"
  type        = string
  default     = "/"
}

# # Security Groups
variable "alb_listener_port" {
  description = "Alb listener port"
  default     = 443
  type        = number
}

variable "alb_listener_protocol" {
  description = "Alb listener protocol"
  default     = "HTTPS"
}

variable "alb_security_group_id" {
  description = "Alb security group id"
  type        = string
  default     = ""
}

variable "allowed_cidr_blocks" {
  description = "Allowed cidr blocks"
  default     = ["0.0.0.0/0"]
}

variable "cloudwatch_log_group" {
  description = "Cloudwatch log group"
  type        = string
  default     = ""
}

variable "task_role_arn" {
  description = "Task role ARN"
  type        = string
  default     = ""
}

variable "retention_in_days" {
  description = "Retention in days for CloudWatch Logs"
  default     = 7
}

variable "ssl_policy" {
  description = "SSL Policy for ALB"
  default     = "ELBSecurityPolicy-2016-08"
}

variable "certificate_arn" {
  description = "ARN of the certificate to use for ALB"
  default     = null
}

variable "healthy_threshold" {
  description = "Number of consecutive health checks successes required before considering an unhealthy target healthy"
  default     = 3
  type        = number
}

variable "unhealthy_threshold" {
  description = "Number of consecutive health check failures required before considering a target unhealthy"
  default     = 3
  type        = number
}

variable "interval" {
  description = "Time between health checks"
  default     = 30
  type        = number
}

variable "timeout" {
  description = "Timeout for health checks"
  default     = 10
  type        = number
}

variable "matcher" {
  description = "Matcher for health checks"
  default     = "200-299"
  type        = string
}

variable "deregistration_delay" {
  description = "Time to wait before deregistering a target"
  default     = 20
  type        = number
}

variable "tags" {
  description = "Tags for the service"
  default     = null
  type        = map(string)
}