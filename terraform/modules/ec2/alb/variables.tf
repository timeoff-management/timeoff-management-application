variable "app_name" {
    description = "App name"
}

variable "tags" {
    type = map(string)
}

variable "vpc_id" {
    description = "Vpc id"
}

variable "subnets" {
    description = "The vpc subnets"
    type = list(string)
}

variable "security_groups" {
    description = "The vpc security group"
    type = list(string)
}