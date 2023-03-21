# variables.tf

variable "aws_region" {
  description = "The AWS region things are created in"
}

variable "ecs_task_execution_role_name" {
  description = "ECS task execution role name"
  default = "EcsTaskExecutionRole"
}

variable "app_image" {
  description = "Docker image to run in the ECS cluster"
}

variable "app_port" {
  description = "Port exposed by the docker image to redirect traffic to"
  default     = 3000
}

variable "app_count" {
  description = "Number of docker containers to run"
  default     = 3
}

variable "health_check_path" {
  default = "/"
}

variable "fargate_cpu" {
  description = "Fargate instance CPU units to provision (1 vCPU = 1024 CPU units)"
  default     = "1024"
}

variable "fargate_memory" {
  description = "Fargate instance memory to provision (in MiB)"
  default     = "2048"
}

variable "vpc_id" {
  type = string
  description = "VPC Id" 
}

variable "vpc_public_subet_ids" {
  type = list
  description = "List of Public Subnets"
}

variable "vpc_private_subet_ids" {
  type = list
  description = "List of Private Subnets"
}

variable "task_family" {
  type = string
  description = "Name of the task group"
}

variable "ecs_cluster_name" {
  type = string
  description = "ECS Cluster Name"
}

variable "ecs_cluster_service_name" {
  type = string
  description = "ECS Cluster Service Name"
}

variable "vpc_default_sg_id" {
  description = "ID for the default VPC Security Group"
  type = string
}