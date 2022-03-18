include {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules//ecs_cluster"
}

inputs = {
  name = "time-off"
  env  = "dev"

  tags = {
    Environment = "dev"
  }
}
