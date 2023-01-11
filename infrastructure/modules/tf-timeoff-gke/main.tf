resource "google_service_account" "gke_svc_account" {
  account_id   = join("-", ["svc", var.cluster_svc_account_name, var.gcp_account_id])
  display_name = var.cluster_svc_account_name
}

resource "google_container_cluster" "gke_cluster" {
  name     = join("-", ["gke", var.cluster_name, var.gcp_account_id])
  location = var.cluster_location

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = var.cluster_remove_default_pool
  initial_node_count       = var.cluster_initial_node_count
}

resource "google_container_node_pool" "gke_node_pool" {
  name       = join("-", ["gke-pool", var.node_pool_name])
  location   = "us-central1"
  cluster    = google_container_cluster.gke_cluster.name
  node_count = var.node_pool_count

  node_config {
    preemptible  = var.node_pool_preemptible
    machine_type = var.node_pool_machine_type

    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    service_account = google_service_account.gke_svc_account.email
    oauth_scopes    = var.node_pool_oauth_scopes
  }
}