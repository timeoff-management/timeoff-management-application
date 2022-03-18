include {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules//ecs_service"
}
locals {
  env = "dev"
}

inputs = {
  app_name          = "time-off"
  env               = local.env
  domain_name       = "migs-lair.tk"
  vpc_id            = "vpc-04c5205f871b029c6"
  container_port    = 3000
  cluster_id        = "dev-time-off"

  desired_count = 1
  deployment_maximum_percent = 200
  deployment_minimum_healthy_percent = 100
  
  tags = {
    Environment   = local.env
    ProvisionedBy = "Terraform"
  }
}
