module "timeoff-service" {
  source               = "../modules/service"
  vpc_id               = "vpc-0b4f0fb6563d89bb1"
  cluster_name         = "core"
  service_name         = local.name
  task_definition_name = "timeoff:8"
  desired_count        = 1
  container_name       = "timeoff-app"
  container_port       = 3000
  protocol             = "HTTP"
  security_groups      = ["sg-0477286029e44798f"]
  subnets = [
    "subnet-05b45e447fbfea725",
    "subnet-08eef1343154a12ec",
  ]
}

locals {
  name = "timeoff-http-3000-deploy"
}