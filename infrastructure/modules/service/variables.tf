variable "vpc_id" {
}

variable "cluster_name" {
}

variable "service_name" {
}

variable "task_definition_name" {
}

variable "desired_count" {
}

variable "iam_role" {
  default = "aws-service-role"
}

variable "container_name" {
}

variable "container_port" {
}

variable "alb_listener_arn" {

}

variable "subnets" {
}

variable "alb_security_group_id" {
}