include {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules//ecr"
}

inputs = {
  name = "time-off"

  tags = {
    Environment = "non-prod"
  }
}
