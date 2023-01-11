terraform {
  backend "gcs" {
    bucket = "tf-state-timeoff"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = "big-liberty-373120"
  region  = "us-central1"
}