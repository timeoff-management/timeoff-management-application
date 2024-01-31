terraform {
  backend "gcs" {
    bucket  = "timeoff-mgmt-tf-state-bucket"
    prefix  = "dev/terraform.tfstate"
  }
}
