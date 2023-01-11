variable "gcp_account_id" {
  type = string

}

variable "cluster_name" {
  type = string
}

variable "cluster_svc_account_name" {
  type = string

}

variable "cluster_location" {
  type    = string
  default = "us-central1"
}

variable "cluster_remove_default_pool" {
  type    = bool
  default = true
}

variable "cluster_initial_node_count" {
  type    = number
  default = 1

}

variable "node_pool_name" {
  type = string

}

variable "node_pool_count" {
  type    = number
  default = 1

}

variable "node_pool_preemptible" {
  type    = bool
  default = true

}

variable "node_pool_machine_type" {
  type    = string
  default = "e2-medium"

}

variable "node_pool_oauth_scopes" {
  type    = list(any)
  default = ["https://www.googleapis.com/auth/cloud-platform"]

}