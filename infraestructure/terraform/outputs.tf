output "client_key" {
  value = azurerm_kubernetes_cluster.main.kube_config[0].client_key
}

output "client_certificate" {
  value = azurerm_kubernetes_cluster.main.kube_config[0].client_certificate
}

output "cluster_ca_certificate" {
  value = azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate
}

output "host" {
  value = azurerm_kubernetes_cluster.main.kube_config[0].host
}

output "username" {
  value = azurerm_kubernetes_cluster.main.kube_config[0].username
}

output "password" {
  value = azurerm_kubernetes_cluster.main.kube_config[0].password
}

output "node_resource_group" {
  value = azurerm_kubernetes_cluster.main.node_resource_group
}

output "location" {
  value = azurerm_kubernetes_cluster.main.location
}

output "aks_id" {
  value = azurerm_kubernetes_cluster.main.id
}

output "kube_config_raw" {
  sensitive = true
  value = azurerm_kubernetes_cluster.main.kube_config_raw
}

output "ui_public_fqdn" {
  value = azurerm_public_ip.ui.fqdn
}

output "ui_public_ip" {
  value = azurerm_public_ip.ui.ip_address
}
