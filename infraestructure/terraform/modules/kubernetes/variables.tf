variable "host" {
  description = "Kubernetes host that was created"
  type = string
}

variable "client_certificate" {
  description = "Username for the kubernetes authentication"
  type = string
}

variable "client_key" {
  description = "key for the kubernetes authentication client"
  type = string
}

variable "cluster_ca_certificate" {
  description = "Kubernetes ca certificate"
  type = string
}

variable "ui_fqdn" {
  description = "FQDN that was created for the ui ingress traffic"
  type = string
}

variable "ui_public_ip" {
  description = "Public ip that was created for the ui ingress traffic"
  type = string
}

variable "registry_server" {
  description = "The url for the private docker container registry"

}

variable "registry_username" {
  description = "The username for the registry server"

}

variable "registry_password" {
  description = "The password for the registry server"

}

