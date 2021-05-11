variable "resource" {
  type        = bool
  description = "Enable the creation of azure resource group or not"
  default     = true
}

variable "resource_group_name" {
  description = "The resource group name to be imported"
  default     = "timeoff"
}

variable "location" {
  default     = "eastus2"
  description = "The username of the local administrator to be created on the Kubernetes cluster"
}

variable "vm_size" {
  default     = "standard_b2s"
  description = "The vm size for the kubernete nodes"
}

variable "prefix" {
  default     = "test"
  description = "The prefix for the resources created in the specified Azure Resource Group"
}


variable "aks_version" {
  default     = "1.18.17"
  description = "The version for the kubernetes to use."
}


variable "client_id" {
  description = "The Client ID (appId) for the Service Principal used for the AKS deployment"
}

variable "tenant_id" {
  description = "The Client ID (appId) for the Service Principal used for the AKS deployment"
}

variable "client_secret" {
  description = "The Client Secret (password) for the Service Principal used for the AKS deployment"
}




