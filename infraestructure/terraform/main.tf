provider "azurerm" {
  features {}
  client_id = var.client_id
  tenant_id = var.tenant_id
  client_secret = var.client_secret
  subscription_id = "6ff5a820-efee-4212-a50a-d0228dd58ca2"
}


#create resource group. there ia a condition if variable "resource" set to true means that we got to create one. We need to put the name in "resource_group_name variable" .

resource "azurerm_resource_group" "resource" {
  count    = var.resource ? 1 : 0
  name     = var.resource_group_name
  location = var.location

}

resource "azurerm_virtual_network" "main" {
  name                = "${var.prefix}-network"
  address_space       = ["172.18.0.0/24"]
  location            = var.resource ? azurerm_resource_group.resource[0].location : var.location
  resource_group_name = var.resource ? azurerm_resource_group.resource[0].name : var.resource_group_name


}

resource "azurerm_subnet" "main" {
  name                 = "${var.prefix}-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["172.18.0.0/25"]
}


resource "azurerm_kubernetes_cluster" "main" {
  name                = "${var.prefix}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.prefix}-dns"
  kubernetes_version  = var.aks_version

  default_node_pool {
    name           = "default"
    node_count     = 1
    vm_size        = var.vm_size
    vnet_subnet_id = azurerm_subnet.main.id

  }
  role_based_access_control {
    enabled = true
  }

  network_profile {
    network_plugin = "azure"
  }

  service_principal {
    client_id     = var.client_id
    client_secret = var.client_secret
  }

}


resource "azurerm_public_ip" "ui" {
  name                = "taxwave_ui"
  location            = var.resource ? azurerm_resource_group.resource[0].location : var.location
  resource_group_name = azurerm_kubernetes_cluster.main.node_resource_group
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = "test-timeoff-management"
}


module "call_secret" {
  source                 = "./modules/kubernetes"
  host                   = azurerm_kubernetes_cluster.main.kube_config[0].host
  client_certificate     = base64decode(azurerm_kubernetes_cluster.main.kube_config[0].client_certificate)
  client_key             = base64decode(azurerm_kubernetes_cluster.main.kube_config[0].client_key)
  cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate)
  ui_fqdn                = azurerm_public_ip.ui.fqdn
  ui_public_ip           = azurerm_public_ip.ui.ip_address
}
